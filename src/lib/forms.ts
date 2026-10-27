import { verifyAdminKey } from '@/lib/auth'
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

// Devuelve el formulario solo si la clave de administración es correcta.
// Un id inválido, un formulario inexistente y una clave errada se tratan igual
// para no revelar qué formularios existen.
export async function getFormForAdmin(
  id: string,
  adminKey: string | null | undefined,
): Promise<FormRecord | null> {
  if (!isFormId(id) || !adminKey) return null
  const record = await getForm(id)
  if (!record) return null
  return verifyAdminKey({ get: () => adminKey }, record.adminKey) ? record : null
}
