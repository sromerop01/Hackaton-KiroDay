import { nanoid } from 'nanoid'
import { NextResponse, type NextRequest } from 'next/server'
import { ExtractionError, IlegibleError, extractFormSchema } from '@/lib/bedrock'
import { saveForm } from '@/lib/db'
import { imageKeyFor, uploadImage } from '@/lib/storage'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

// POST /api/forms — recibe la foto del formulario, la analiza con Bedrock,
// guarda la imagen en S3 y el formulario en DynamoDB.
// Devuelve { id, adminKey }. El adminKey SOLO se devuelve aquí, nunca más.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData()
  const file = formData.get('image')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Falta la imagen del formulario' },
      { status: 400 },
    )
  }

  // Verificar el tamaño ANTES de llamar a Bedrock.
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: 'La imagen es demasiado grande (máximo 5 MB)' },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())

  let schema
  try {
    schema = await extractFormSchema(bytes)
  } catch (error) {
    // En cualquier error de extracción NO se crea el formulario.
    if (error instanceof IlegibleError) {
      return NextResponse.json(
        { error: 'El paciente no respondió, intenta de nuevo' },
        { status: 422 },
      )
    }
    if (error instanceof ExtractionError) {
      return NextResponse.json(
        { error: 'No pudimos revivir este formulario, intenta con otra foto' },
        { status: 502 },
      )
    }
    throw error
  }

  const id = nanoid(10)
  const adminKey = nanoid(24)

  await uploadImage(id, bytes)

  await saveForm({
    pk: `FORM#${id}`,
    sk: 'META',
    id,
    adminKey,
    title: schema.title,
    description: schema.description,
    fields: schema.fields,
    imageKey: imageKeyFor(id),
    status: 'borrador',
    createdAt: new Date().toISOString(),
  })

  return NextResponse.json({ id, adminKey })
}
