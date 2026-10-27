import { z } from 'zod'
import type { FieldDef, FormSchemaType } from '@/lib/schema'

// Construye el esquema Zod de una respuesta a partir de la definición del campo.
function buildFieldSchema(field: FieldDef): z.ZodTypeAny {
  const v = field.validation

  switch (field.type) {
    case 'number': {
      let schema = z.coerce.number()
      if (typeof v?.min === 'number') schema = schema.gte(v.min)
      if (typeof v?.max === 'number') schema = schema.lte(v.max)
      return schema
    }

    case 'email':
      return z.email()

    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

    case 'select': {
      const options = field.options ?? []
      return z.enum(options as [string, ...string[]])
    }

    case 'checkbox': {
      if (field.options && field.options.length > 0) {
        const schema = z.array(z.enum(field.options as [string, ...string[]]))
        return field.required ? schema.min(1) : schema
      }
      // Una casilla única obligatoria ("Acepto…") solo es válida si está marcada.
      return field.required ? z.literal(true) : z.boolean()
    }

    case 'text':
    case 'textarea':
    default: {
      let schema = z.string()
      if (field.required) schema = schema.min(1)
      if (typeof v?.minLength === 'number') schema = schema.min(v.minLength)
      if (typeof v?.maxLength === 'number') schema = schema.max(v.maxLength)
      if (v?.pattern) schema = schema.regex(new RegExp(v.pattern))
      return schema
    }
  }
}

export function buildResponseSchema(form: FormSchemaType): z.ZodObject {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of form.fields) {
    const fieldSchema = buildFieldSchema(field)
    shape[field.id] = field.required ? fieldSchema : fieldSchema.optional()
  }

  return z.object(shape)
}

// Deja solo los campos del formulario y convierte los textos vacíos en
// undefined: así un número opcional vacío no se convierte en 0 y un campo
// obligatorio vacío se reporta como faltante.
export function normalizeValues(
  form: FormSchemaType,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of form.fields) {
    const value = raw[field.id]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      values[field.id] = trimmed === '' ? undefined : trimmed
    } else {
      values[field.id] = value
    }
  }
  return values
}

export type FieldErrors = Record<string, string>

export type ValidationResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; errors: FieldErrors }

function messageFor(
  issue: z.core.$ZodIssue,
  field: FieldDef,
  value: unknown,
): string {
  if (value === undefined) return 'Este campo es obligatorio'

  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'array') return 'Elige al menos una opción'
      if (issue.origin === 'number') return `Debe ser mayor o igual a ${issue.minimum}`
      return `Debe tener al menos ${issue.minimum} caracteres`
    case 'too_big':
      if (issue.origin === 'number') return `Debe ser menor o igual a ${issue.maximum}`
      return `Debe tener como máximo ${issue.maximum} caracteres`
    case 'invalid_format':
      if (field.type === 'email') return 'Escribe un correo válido'
      if (field.type === 'date') return 'Escribe una fecha válida'
      return 'El formato no es válido'
    case 'invalid_type':
      return field.type === 'number' ? 'Escribe un número válido' : 'Revisa este campo'
    case 'invalid_value':
      if (field.type === 'checkbox' && !field.options?.length) return 'Debes marcar esta casilla'
      return 'Elige una opción de la lista'
    default:
      return 'Revisa este campo'
  }
}

// Valida una respuesta contra el formulario y devuelve, por campo, el primer
// error en español. Se usa igual en el cliente y en el servidor.
export function validateResponse(
  form: FormSchemaType,
  raw: Record<string, unknown>,
): ValidationResult {
  const values = normalizeValues(form, raw)
  const result = buildResponseSchema(form).safeParse(values)
  if (result.success) return { success: true, data: result.data }

  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const fieldId = issue.path[0]
    if (typeof fieldId !== 'string' || errors[fieldId]) continue
    const field = form.fields.find((f) => f.id === fieldId)
    if (field) errors[fieldId] = messageFor(issue, field, values[fieldId])
  }
  return { success: false, errors }
}
