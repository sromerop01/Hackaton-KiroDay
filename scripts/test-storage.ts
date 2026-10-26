// Prueba local del flujo foto → registro en DynamoDB de punta a punta,
// contra la cuenta real (la tabla y el bucket YA EXISTEN; no se crea infra).
// Uso: npx tsx scripts/test-storage.ts
//
// Reproduce el flujo del POST /api/forms importando las funciones de src/lib
// directamente: extractFormSchema → genera id/adminKey → uploadImage → saveForm.
// Luego hace getForm(id) y muestra el item recuperado OMITIENDO el adminKey.
import { readFileSync } from 'node:fs'
import { nanoid } from 'nanoid'
import { extractFormSchema } from '@/lib/bedrock'
import { getForm, saveForm } from '@/lib/db'
import { imageKeyFor, uploadImage } from '@/lib/storage'

// Node 25 soporta process.loadEnvFile; no se agrega dotenv.
process.loadEnvFile('.env.local')

const FIXTURE = 'scripts/fixtures/01-ideal.jpg'

async function main(): Promise<void> {
  const bytes = new Uint8Array(readFileSync(FIXTURE))

  console.log(`Imagen: ${FIXTURE}`)
  console.log(`Modelo: ${process.env.BEDROCK_MODEL_ID ?? '(no definido)'}`)
  console.log('Extrayendo esquema con Bedrock…')

  const schema = await extractFormSchema(bytes)

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
