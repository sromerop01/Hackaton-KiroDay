// Publica el formulario de respaldo para la demo (plan B si fallan la cámara,
// la red del lugar o Bedrock). No llama a Bedrock: el esquema ya está escrito.
// Uso: npx tsx scripts/seed-demo.ts [--base-url https://main.xxxx.amplifyapp.com] [--image ruta.jpg]
import { readFileSync } from 'node:fs'
import { nanoid } from 'nanoid'
import { FormSchema, type FormSchemaType } from '@/lib/schema'

const DEFAULT_IMAGE = 'scripts/assets/formulario-demo.jpg'

// Mismo contenido que la hoja de scripts/assets/formulario-demo.jpg.
const DEMO_FORM: FormSchemaType = {
  title: 'Inscripción al taller Kiro Day',
  description: 'AWS User Group Medellín',
  fields: [
    {
      id: 'nombre_completo',
      label: 'Nombre completo',
      type: 'text',
      required: true,
      validation: { minLength: 3, maxLength: 80 },
    },
    { id: 'correo_electronico', label: 'Correo electrónico', type: 'email', required: true },
    {
      id: 'rol',
      label: 'Rol',
      type: 'select',
      required: true,
      options: ['Estudiante', 'Desarrollador/a', 'Arquitecto/a', 'Otro'],
    },
    { id: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: false },
    {
      id: 'temas_interes',
      label: 'Temas de interés',
      type: 'checkbox',
      required: false,
      options: ['Bedrock', 'Amplify', 'DynamoDB', 'Kiro'],
    },
    {
      id: 'comentarios',
      label: 'Comentarios',
      type: 'textarea',
      required: false,
      validation: { maxLength: 500 },
    },
    {
      id: 'acepta_datos',
      label: 'Acepto el tratamiento de mis datos personales',
      type: 'checkbox',
      required: true,
    },
  ],
}

function parseArgs(argv: string[]): { baseUrl: string; imagePath: string } {
  let baseUrl = process.env.DEMO_BASE_URL ?? 'http://localhost:3000'
  let imagePath = DEFAULT_IMAGE
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base-url' && argv[i + 1]) baseUrl = argv[++i]
    else if (argv[i] === '--image' && argv[i + 1]) imagePath = argv[++i]
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), imagePath }
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // Sin .env.local: se usan las variables del entorno actual.
  }

  const missing = ['APP_REGION', 'DDB_TABLE', 'S3_BUCKET'].filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(', ')}`)
    process.exitCode = 1
    return
  }

  // Los clientes de AWS leen la región al importarse, así que se cargan
  // después de las variables de entorno.
  const { saveForm } = await import('@/lib/db')
  const { imageKeyFor, uploadImage } = await import('@/lib/storage')

  const { baseUrl, imagePath } = parseArgs(process.argv.slice(2))
  const form = FormSchema.parse(DEMO_FORM)
  const bytes = new Uint8Array(readFileSync(imagePath))

  const id = nanoid(10)
  const adminKey = nanoid(24)

  await uploadImage(id, bytes)
  await saveForm({
    pk: `FORM#${id}`,
    sk: 'META',
    id,
    adminKey,
    title: form.title,
    description: form.description,
    fields: form.fields,
    imageKey: imageKeyFor(id),
    status: 'publicado',
    createdAt: new Date().toISOString(),
  })

  const admin = `k=${encodeURIComponent(adminKey)}`
  console.log(`Formulario de respaldo publicado: ${form.title} (${form.fields.length} campos)\n`)
  console.log(`Enlace público:  ${baseUrl}/f/${id}`)
  console.log(`QR (admin):      ${baseUrl}/f/${id}/publicado?${admin}`)
  console.log(`Respuestas:      ${baseUrl}/f/${id}/respuestas?${admin}`)
  console.log(`Revisión:        ${baseUrl}/revisar/${id}?${admin}`)
  console.log(`adminKey:        ${adminKey}`)
  console.log('\nGuarda el adminKey en un lugar privado; no lo muestres en pantalla ni lo subas al repo.')
}

main().catch((error: unknown) => {
  console.error('No se pudo publicar el formulario de respaldo:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
