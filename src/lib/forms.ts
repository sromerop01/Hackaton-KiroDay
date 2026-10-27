import { getForm, type FormRecord } from '@/lib/db'
import { isFormId } from '@/lib/ids'
import type { FormSchemaType } from '@/lib/schema'

// Esquema del formulario sin datos internos (adminKey, imageKey, pk/sk).
// Es lo único que se envía al cliente.
export function toPublicSchema(record: FormRecord): FormSchemaType {
  return {
    title: record.title,
    description: record.description,
    fields: record.fields,
  }
}

// Devuelve el formulario solo si existe y está publicado.
export async function getPublishedForm(id: string): Promise<FormRecord | null> {
  if (!isFormId(id)) return null
  const record = await getForm(id)
  return record?.status === 'publicado' ? record : null
}
