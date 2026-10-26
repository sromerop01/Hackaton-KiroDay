import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import type { FormSchemaType } from '@/lib/schema'

// removeUndefinedValues es obligatorio: evita que `description` opcional
// (undefined) rompa el PutCommand.
const client = new DynamoDBClient({ region: process.env.APP_REGION })
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

// Registro de formulario en DynamoDB (sk = 'META').
export interface FormRecord {
  pk: string // `FORM#{id}`
  sk: 'META'
  id: string
  adminKey: string
  title: string
  description?: string
  fields: FormSchemaType['fields']
  imageKey: string
  status: 'borrador' | 'publicado'
  createdAt: string
}

// Registro de respuesta en DynamoDB (sk = `RESP#{timestamp}#{uuid}`).
export interface ResponseRecord {
  pk: string // `FORM#{id}`
  sk: string // `RESP#{timestamp}#{uuid}`
  values: Record<string, unknown>
  submittedAt: string
}

function formPk(id: string): string {
  return `FORM#${id}`
}

export async function saveForm(form: FormRecord): Promise<void> {
  await doc.send(
    new PutCommand({ TableName: process.env.DDB_TABLE, Item: form }),
  )
}

export async function getForm(id: string): Promise<FormRecord | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: process.env.DDB_TABLE,
      Key: { pk: formPk(id), sk: 'META' },
    }),
  )
  return (result.Item as FormRecord | undefined) ?? null
}

export async function updateForm(
  id: string,
  updates: Partial<FormRecord>,
): Promise<void> {
  // Solo se actualizan atributos mutables; nunca pk/sk/id.
  const editable = ['title', 'description', 'fields', 'status'] as const
  const names: Record<string, string> = {}
  const valuesMap: Record<string, unknown> = {}
  const setExpr: string[] = []

  for (const key of editable) {
    const value = updates[key]
    if (value === undefined) continue
    names[`#${key}`] = key
    valuesMap[`:${key}`] = value
    setExpr.push(`#${key} = :${key}`)
  }

  if (setExpr.length === 0) return

  await doc.send(
    new UpdateCommand({
      TableName: process.env.DDB_TABLE,
      Key: { pk: formPk(id), sk: 'META' },
      UpdateExpression: `SET ${setExpr.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: valuesMap,
    }),
  )
}

export async function listResponses(formId: string): Promise<ResponseRecord[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: process.env.DDB_TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': formPk(formId),
        ':prefix': 'RESP#',
      },
    }),
  )
  return (result.Items as ResponseRecord[] | undefined) ?? []
}

export async function saveResponse(response: ResponseRecord): Promise<void> {
  await doc.send(
    new PutCommand({ TableName: process.env.DDB_TABLE, Item: response }),
  )
}
