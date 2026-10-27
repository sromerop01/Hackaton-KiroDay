import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { listResponses, saveResponse } from '@/lib/db'
import { getFormForAdmin, getPublishedForm, toPublicSchema } from '@/lib/forms'
import { validateResponse } from '@/lib/validate'

const MAX_BODY_BYTES = 100 * 1024

// GET /api/forms/{id}/responses?k=adminKey — respuestas del formulario (solo administración).
export async function GET(
  request: NextRequest,
  { params }: RouteContext<'/api/forms/[id]/responses'>,
): Promise<NextResponse> {
  const { id } = await params
  const record = await getFormForAdmin(id, request.nextUrl.searchParams.get('k'))
  if (!record) return NextResponse.json({ error: 'Acceso denegado' }, { status: 401 })

  const responses = await listResponses(id)
  return NextResponse.json({
    responses: responses.map(({ values, submittedAt }) => ({ values, submittedAt })),
  })
}

// POST /api/forms/{id}/responses — guarda una respuesta del formulario público.
// La validación del cliente no basta: aquí se repite con el mismo esquema.
export async function POST(
  request: NextRequest,
  { params }: RouteContext<'/api/forms/[id]/responses'>,
): Promise<NextResponse> {
  const { id } = await params

  const form = await getPublishedForm(id)
  if (!form) {
    return NextResponse.json({ error: 'Este formulario no existe' }, { status: 404 })
  }

  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'La respuesta es demasiado grande' }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Respuesta inválida' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Respuesta inválida' }, { status: 400 })
  }

  const result = validateResponse(toPublicSchema(form), body as Record<string, unknown>)
  if (!result.success) {
    return NextResponse.json({ errors: result.errors }, { status: 400 })
  }

  const submittedAt = new Date().toISOString()
  await saveResponse({
    pk: `FORM#${id}`,
    sk: `RESP#${Date.now()}#${randomUUID()}`,
    values: result.data,
    submittedAt,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
