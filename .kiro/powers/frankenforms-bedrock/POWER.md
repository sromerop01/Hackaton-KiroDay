---
name: "frankenforms-bedrock"
displayName: "FrankenForms — Extracción con Bedrock"
description: "Contexto especializado para trabajar con la extracción de formularios vía Amazon Bedrock Converse API. Incluye el prompt del sistema, la estructura de ConverseCommand con toolChoice forzado, validación Zod y referencia al MCP de documentación de AWS."
keywords:
  - bedrock
  - extracción
  - formulario
  - visión
  - prompt
  - converse
  - tool use
  - emit_form_schema
  - extraction
  - form schema
---

# FrankenForms — Power de Extracción con Bedrock

Proporciona contexto especializado para implementar y depurar la extracción de esquemas de formularios desde imágenes usando Amazon Bedrock.

## Cuándo se activa

Menciona estas palabras clave para que Kiro cargue este contexto automáticamente:
`bedrock`, `extracción`, `formulario`, `visión`, `prompt`, `emit_form_schema`, `ConverseCommand`, `toolChoice`

## Reglas del prompt de extracción

El prompt del sistema vive en `src/lib/prompts/extraction.ts` como `export const EXTRACTION_PROMPT`. **No** se lee desde `.kiro/prompts/extraction.md` en runtime (Next.js en Amplify no bundlea archivos fuera de `src/`).

Reglas que el prompt debe cumplir:
1. Conservar el texto original de las etiquetas (idioma, tildes, mayúsculas)
2. Solo incluir campos que existan visiblemente en el papel
3. Inferir el tipo según contexto visual
4. `required: true` solo si hay asterisco, "obligatorio" o equivalente explícito
5. `id`: snake_case ASCII sin tildes, derivado del label
6. Si la imagen no es un formulario o es ilegible → `title: "ILEGIBLE"` con un campo `text`

## Estructura de ConverseCommand (referencia canónica)

```typescript
import { EXTRACTION_PROMPT } from '@/lib/prompts/extraction'
import { FormSchema } from '@/lib/schema'
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
} from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: process.env.APP_REGION })

// Generar JSON Schema con Zod 4 nativo y eliminar $schema
const { $schema, ...formJsonSchema } = z.toJSONSchema(FormSchema)

const input: ConverseCommandInput = {
  modelId: process.env.BEDROCK_MODEL_ID,   // inference profile ID
  system: [{ text: EXTRACTION_PROMPT }],
  messages: [{
    role: 'user',
    content: [
      // Imagen como bytes crudos (Uint8Array) — el SDK NO requiere base64 manual
      { image: { format: 'jpeg', source: { bytes: imageUint8Array } } },
      { text: 'Extrae el esquema del formulario.' },
    ],
  }],
  toolConfig: {
    tools: [{
      toolSpec: {
        name: 'emit_form_schema',
        description: 'Emite el esquema estructurado del formulario detectado en la imagen.',
        inputSchema: { json: formJsonSchema },   // sin la clave $schema
      },
    }],
    // toolChoice.tool solo soportado por Anthropic Claude 3+ y Amazon Nova
    toolChoice: { tool: { name: 'emit_form_schema' } },
  },
  inferenceConfig: { temperature: 0, maxTokens: 4096 },
}
```

## Extraer la respuesta y flujo de reintento

```typescript
function extractToolInput(response: ConverseCommandOutput) {
  return response.output?.message?.content
    ?.find(b => b.toolUse?.name === 'emit_form_schema')
    ?.toolUse?.input
}

// Primer intento
let raw = extractToolInput(await client.send(new ConverseCommand(input)))
let parsed = FormSchema.safeParse(raw)

// Un reintento si falla la validación Zod
if (!parsed.success) {
  const errorMsg = parsed.error.message
  // Agregar el error como mensaje de usuario adicional
  const retryInput = {
    ...input,
    messages: [
      ...input.messages,
      { role: 'assistant' as const, content: [{ toolUse: { toolUseId: '1', name: 'emit_form_schema', input: raw } }] },
      { role: 'user' as const, content: [{ text: `Error de validación: ${errorMsg}. Por favor corrige y vuelve a llamar emit_form_schema.` }] },
    ],
  }
  raw = extractToolInput(await client.send(new ConverseCommand(retryInput)))
  parsed = FormSchema.safeParse(raw)
}

if (!parsed.success) throw new ExtractionError('Fallo tras dos intentos')
if (parsed.data.title === 'ILEGIBLE') throw new IlegibleError()
return parsed.data
```

## Bytes de imagen desde File del navegador

```typescript
// En el cliente, después de compressImage():
const blob = await compressImage(file)
const arrayBuffer = await blob.arrayBuffer()
const imageBytes = new Uint8Array(arrayBuffer)
// Se envía como multipart/form-data al servidor, que lo convierte:
// const bytes = Buffer.from(await formData.get('image').arrayBuffer())
// const imageUint8Array = new Uint8Array(bytes)
```

## Variables de entorno (nunca empiezan por AWS_)

| Variable | Ejemplo |
|---|---|
| `APP_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `us.amazon.nova-pro-v1:0` |

## Referencia al MCP de documentación de AWS

El servidor MCP `aws-docs` (configurado en `.kiro/settings/mcp.json`) permite consultar la documentación oficial. Úsalo para verificar ARNs de modelos, parámetros de ConverseCommand y políticas IAM antes de implementar.
