// Prueba local del flujo foto → registro en DynamoDB de punta a punta,
// contra la cuenta real (la tabla y el bucket YA EXISTEN; no se crea infra).
// Uso: npx tsx scripts/test-storage.ts [--skip-bedrock]
//
// Reproduce el flujo del POST /api/forms importando las funciones de src/lib
// directamente: extractFormSchema → genera id/adminKey → uploadImage → saveForm.
// Luego hace getForm(id) y muestra el item recuperado OMITIENDO el adminKey.
//
// Modos:
//   - Normal (por defecto): intenta extractFormSchema con Bedrock. Si la
//     llamada falla con un error de red (ECONNRESET / ERR_HTTP2_STREAM_CANCEL /
//     timeout), avisa y continúa con un esquema de ejemplo para igualmente
//     ejercitar el flujo de storage (S3 + DynamoDB).
//   - --skip-bedrock: fuerza el esquema de ejemplo sin intentar Bedrock.
import { readFileSync } from 'node:fs'
import { nanoid } from 'nanoid'
import { extractFormSchema } from '@/lib/bedrock'
import { getForm, saveForm } from '@/lib/db'
import { imageKeyFor, uploadImage } from '@/lib/storage'
import type { FormSchemaType } from '@/lib/schema'

// Node 25 soporta process.loadEnvFile; no se agrega dotenv.
process.loadEnvFile('.env.local')

const FIXTURE = 'scripts/fixtures/01-ideal.jpg'

// Esquema de ejemplo para ejercitar S3 + DynamoDB cuando Bedrock no responde.
// No representa datos "reales"; solo verifica la capa de storage de la Tarea 6.
const SAMPLE_SCHEMA: FormSchemaType = {
  title: 'Formulario de prueba',
  fields: [
    { id: 'nombre', label: 'Nombre completo', type: 'text', required: true },
    { id: 'correo', label: 'Correo electrónico', type: 'email', required: true },
    {
      id: 'turno',
      label: 'Turno',
      type: 'select',
      required: false,
      options: ['Mañana', 'Tarde'],
    },
  ],
}

// Detecta errores de red transitorios del cliente de Bedrock Runtime (HTTP/2).
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const codes = ['ECONNRESET', 'ERR_HTTP2_STREAM_CANCEL', 'ETIMEDOUT', 'TimeoutError']
  const haystack = `${error.name} ${error.message} ${String((error as { code?: string }).code ?? '')} ${String((error as { cause?: unknown }).cause ?? '')}`
  return codes.some((code) => haystack.includes(code))
}

async function resolveSchema(
  bytes: Uint8Array,
  skipBedrock: boolean,
): Promise<FormSchemaType> {
  if (skipBedrock) {
    console.log('--skip-bedrock: usando esquema de ejemplo (no se llama a Bedrock).')
    return SAMPLE_SCHEMA
  }

  console.log('Extrayendo esquema con Bedrock…')
  try {
    return await extractFormSchema(bytes)
  } catch (error) {
    if (isNetworkError(error)) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(
        `Bedrock no disponible en este entorno por error de red transitorio: ${message}; ` +
          'usando esquema de ejemplo para verificar el flujo de storage.',
      )
      return SAMPLE_SCHEMA
    }
    throw error
  }
}

async function main(): Promise<void> {
  const skipBedrock = process.argv.slice(2).includes('--skip-bedrock')
  const bytes = new Uint8Array(readFileSync(FIXTURE))

  console.log(`Imagen: ${FIXTURE}`)
  console.log(`Modelo: ${process.env.BEDROCK_MODEL_ID ?? '(no definido)'}`)

  const schema = await resolveSchema(bytes, skipBedrock)

  const id = nanoid(10)
  const adminKey = nanoid(24)

  console.log(`Subiendo imagen a S3 (bucket ${process.env.S3_BUCKET})…`)
  await uploadImage(id, bytes)
  console.log(`Objeto subido a S3: ${imageKeyFor(id)}`)

  console.log(`Guardando formulario en DynamoDB (tabla ${process.env.DDB_TABLE})…`)
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

  console.log(`\nFormulario creado con id: ${id}`)
  console.log('El adminKey existe en el registro pero NO se imprime (invariante de seguridad).\n')

  const form = await getForm(id)
  if (!form) {
    console.error('No se recuperó el formulario de DynamoDB')
    process.exitCode = 1
    return
  }

  // Se omite adminKey deliberadamente al imprimir.
  const { adminKey: _omitido, ...publicRecord } = form
  void _omitido
  console.log('Item recuperado de DynamoDB (sin adminKey):')
  console.log(JSON.stringify(publicRecord, null, 2))
}

main()
