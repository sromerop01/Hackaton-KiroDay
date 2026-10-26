import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type ConverseCommandOutput,
  type Message,
} from '@aws-sdk/client-bedrock-runtime'
import type { DocumentType } from '@smithy/types'
import { z } from 'zod'
import { EXTRACTION_PROMPT } from '@/lib/prompts/extraction'
import { FormSchema, type FormSchemaType } from '@/lib/schema'

const TOOL_NAME = 'emit_form_schema'

// Se lanza cuando la validación falla tras los dos intentos, o cuando el
// modelo no llamó a la herramienta emit_form_schema.
export class ExtractionError extends Error {
  constructor(message = 'No se pudo extraer el esquema del formulario') {
    super(message)
    this.name = 'ExtractionError'
  }
}

// Se lanza cuando el modelo determina que la imagen no es un formulario o es
// ilegible (devuelve title === 'ILEGIBLE').
export class IlegibleError extends Error {
  constructor(message = 'La imagen no es un formulario legible') {
    super(message)
    this.name = 'IlegibleError'
  }
}

// JSON Schema del FormSchema sin la clave $schema (Bedrock no la admite).
function buildToolInputSchema(): DocumentType {
  // Bedrock no admite la clave $schema en inputSchema.json, así que se descarta
  // por desestructuración antes de pasar el JSON Schema al toolSpec.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...jsonSchema } = z.toJSONSchema(FormSchema)
  if (jsonSchema.type !== 'object') {
    throw new ExtractionError('El JSON Schema del formulario debe ser de tipo object')
  }
  return jsonSchema as DocumentType
}

// Extrae el input del bloque toolUse de emit_form_schema. Nunca lee del texto.
function extractToolInput(response: ConverseCommandOutput): DocumentType | undefined {
  return response.output?.message?.content?.find(
    (block) => block.toolUse?.name === TOOL_NAME,
  )?.toolUse?.input
}

function buildInput(
  modelId: string,
  toolInputSchema: DocumentType,
  messages: Message[],
): ConverseCommandInput {
  return {
    modelId,
    system: [{ text: EXTRACTION_PROMPT }],
    messages,
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: TOOL_NAME,
            description: 'Emite el esquema estructurado del formulario detectado en la imagen.',
            inputSchema: { json: toolInputSchema },
          },
        },
      ],
      // toolChoice forzado: el modelo debe llamar a emit_form_schema.
      toolChoice: { tool: { name: TOOL_NAME } },
    },
    inferenceConfig: { temperature: 0, maxTokens: 4096 },
  }
}

export async function extractFormSchema(
  imageBytes: Uint8Array,
  modelId?: string,
): Promise<FormSchemaType> {
  const resolvedModelId = modelId ?? process.env.BEDROCK_MODEL_ID
  if (!resolvedModelId) {
    throw new ExtractionError('BEDROCK_MODEL_ID no está definido')
  }

  const client = new BedrockRuntimeClient({ region: process.env.APP_REGION })
  const toolInputSchema = buildToolInputSchema()

  const messages: Message[] = [
    {
      role: 'user',
      content: [
        { image: { format: 'jpeg', source: { bytes: imageBytes } } },
        { text: 'Extrae el esquema del formulario usando la herramienta emit_form_schema.' },
      ],
    },
  ]

  // Primer intento.
  const firstResponse = await client.send(
    new ConverseCommand(buildInput(resolvedModelId, toolInputSchema, messages)),
  )
  const firstRaw = extractToolInput(firstResponse)
  let parsed = FormSchema.safeParse(firstRaw)

  // Un único reintento con los errores de Zod como contexto adicional.
  if (!parsed.success) {
    const errorContext = JSON.stringify(z.treeifyError(parsed.error))
    const retryMessages: Message[] = [
      ...messages,
      {
        role: 'assistant',
        content: [
          {
            toolUse: {
              toolUseId: 'retry-1',
              name: TOOL_NAME,
              input: firstRaw ?? ({} as DocumentType),
            },
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            text: `El esquema anterior no pasó la validación. Errores: ${errorContext}. Corrige y vuelve a llamar emit_form_schema.`,
          },
        ],
      },
    ]

    const retryResponse = await client.send(
      new ConverseCommand(
        buildInput(resolvedModelId, toolInputSchema, retryMessages),
      ),
    )
    parsed = FormSchema.safeParse(extractToolInput(retryResponse))
  }

  if (!parsed.success) {
    throw new ExtractionError('La validación del esquema falló tras dos intentos')
  }

  if (parsed.data.title === 'ILEGIBLE') {
    throw new IlegibleError()
  }

  return parsed.data
}
