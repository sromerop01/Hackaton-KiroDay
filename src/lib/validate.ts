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
        return z.array(z.enum(field.options as [string, ...string[]]))
      }
      return z.boolean()
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
