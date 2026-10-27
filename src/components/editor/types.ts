import type { FieldDef, FieldKind, FormSchemaType } from '@/lib/schema'

// Las opciones se editan como texto (una por línea) para poder escribir saltos
// de línea libremente; solo se convierten en lista al guardar.
export interface EditableField {
  field: FieldDef
  optionsText: string
}

export const TYPE_LABELS: Record<FieldKind, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  email: 'Correo',
  select: 'Selección única',
  checkbox: 'Casillas',
}

export function usesOptions(type: FieldKind): boolean {
  return type === 'select' || type === 'checkbox'
}

export function toEditable(field: FieldDef): EditableField {
  return { field, optionsText: (field.options ?? []).join('\n') }
}

export function fromEditable({ field, optionsText }: EditableField): FieldDef {
  const options = optionsText
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)
  const rest = { ...field }
  delete rest.options
  return usesOptions(field.type) && options.length > 0 ? { ...rest, options } : rest
}

// Los ids existentes nunca cambian (las respuestas se guardan por id); los
// campos nuevos reciben uno libre.
export function newField(existing: EditableField[]): EditableField {
  const ids = new Set(existing.map((e) => e.field.id))
  let n = existing.length + 1
  while (ids.has(`campo_${n}`)) n++
  return toEditable({ id: `campo_${n}`, label: 'Nuevo campo', type: 'text', required: false })
}

export function buildForm(
  title: string,
  description: string,
  fields: EditableField[],
): FormSchemaType {
  const trimmed = description.trim()
  return {
    title: title.trim(),
    ...(trimmed ? { description: trimmed } : {}),
    fields: fields.map(fromEditable),
  }
}
