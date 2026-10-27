import { z } from 'zod'

// Tipos de campo permitidos
export const FieldType = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'email',
  'select',
  'checkbox',
])

export const FieldValidation = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z
    .string()
    .max(100)
    .refine(
      (p) => {
        try {
          new RegExp(p)
          return true
        } catch {
          return false
        }
      },
      { message: 'Patrón inválido' },
    )
    .optional(),
})

export const Field = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/, 'id inválido'),
  label: z.string().min(1).max(200),
  type: FieldType,
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().min(1).max(100)).max(50).optional(),
  validation: FieldValidation.optional(),
})

export const FormSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    fields: z.array(Field).min(1).max(60),
  })
  .superRefine((data, ctx) => {
    // ids únicos
    const ids = data.fields.map((f) => f.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    if (dupes.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `IDs duplicados: ${dupes.join(', ')}`,
      })
    }
    // select necesita ≥ 2 opciones
    data.fields.forEach((f, i) => {
      if (f.type === 'select' && (!f.options || f.options.length < 2)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', i, 'options'],
          message: 'select requiere al menos 2 opciones',
        })
      }
    })
  })

// renombrado desde FieldType_/FieldType__ de design.md para claridad
export type FormSchemaType = z.infer<typeof FormSchema>
export type FieldKind = z.infer<typeof FieldType>
export type FieldDef = z.infer<typeof Field>

export const FormStatus = z.enum(['borrador', 'publicado'])
export type FormStatusType = z.infer<typeof FormStatus>

// Cuerpo del PUT /api/forms/{id}: el esquema editado y el estado deseado.
export const UpdateFormRequest = z.object({
  form: FormSchema,
  status: FormStatus,
})
export type UpdateFormRequestType = z.infer<typeof UpdateFormRequest>
