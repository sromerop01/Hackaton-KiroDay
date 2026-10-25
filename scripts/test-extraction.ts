// Prueba local de la extracción con Bedrock.
// Uso: npx tsx scripts/test-extraction.ts <ruta-imagen> [--model <id>]
// Ejemplo: npx tsx scripts/test-extraction.ts scripts/fixtures/01-ideal.jpg --model us.anthropic.claude-haiku-5-5
import { readFileSync } from 'node:fs'
import { extractFormSchema, ExtractionError, IlegibleError } from '@/lib/bedrock'

// Carga .env.local sin agregar dotenv como dependencia.
function loadEnv(path = '.env.local'): void {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(path)
      return
    } catch {
      // El archivo no existe o no es legible; se continúa con el entorno actual.
    }
  }

  try {
    const content = readFileSync(path, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // Sin archivo .env.local: se usa el entorno existente.
  }
}

function parseArgs(argv: string[]): { imagePath?: string; model?: string } {
  let imagePath: string | undefined
  let model: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--model') {
      model = argv[++i]
    } else if (!imagePath) {
      imagePath = arg
    }
  }

  return { imagePath, model }
}

async function main(): Promise<void> {
  loadEnv()

  const { imagePath, model } = parseArgs(process.argv.slice(2))
  if (!imagePath) {
    console.error('Uso: npx tsx scripts/test-extraction.ts <ruta-imagen> [--model <id>]')
    process.exit(1)
  }

  const resolvedModel = model ?? process.env.BEDROCK_MODEL_ID
  const bytes = new Uint8Array(readFileSync(imagePath))

  console.log(`Imagen: ${imagePath}`)
  console.log(`Modelo: ${resolvedModel ?? '(no definido)'}`)

  const start = performance.now()
  try {
    const schema = await extractFormSchema(bytes, model)
    const elapsed = Math.round(performance.now() - start)
    console.log(`Latencia: ${elapsed} ms`)
    console.log('Esquema:')
    console.log(JSON.stringify(schema, null, 2))
  } catch (error) {
    const elapsed = Math.round(performance.now() - start)
    if (error instanceof IlegibleError) {
      console.log(`Latencia: ${elapsed} ms`)
      console.log('ILEGIBLE: el modelo no reconoció un formulario legible.')
      return
    }
    if (error instanceof ExtractionError) {
      console.log(`Latencia: ${elapsed} ms`)
      console.error(`ExtractionError: ${error.message}`)
      process.exitCode = 1
      return
    }
    throw error
  }
}

main()
