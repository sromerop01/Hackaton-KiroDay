'use client'

import { useState, type ComponentType, type FormEvent } from 'react'
import type { FieldDef, FieldKind, FormSchemaType } from '@/lib/schema'
import { validateResponse, type FieldErrors } from '@/lib/validate'
import CheckboxField from './fields/CheckboxField'
import DateField from './fields/DateField'
import EmailField from './fields/EmailField'
import NumberField from './fields/NumberField'
import SelectField from './fields/SelectField'
import TextareaField from './fields/TextareaField'
import TextField from './fields/TextField'
import { inputId, type FieldProps, type FieldValue } from './fields/types'

const COMPONENTS: Record<FieldKind, ComponentType<FieldProps>> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  date: DateField,
  email: EmailField,
  select: SelectField,
  checkbox: CheckboxField,
}

function initialValue(field: FieldDef): FieldValue {
  if (field.type === 'checkbox') return field.options?.length ? [] : false
  return ''
}

interface FormRendererProps {
  form: FormSchemaType
  // Devuelve los errores por campo que reporte el servidor, o null si se guardó.
  onSubmit: (values: Record<string, unknown>) => Promise<FieldErrors | null>
  submitLabel?: string
}

export default function FormRenderer({ form, onSubmit, submitLabel = 'Enviar' }: FormRendererProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(form.fields.map((f) => [f.id, initialValue(f)])),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function focusFirstError(fieldErrors: FieldErrors): void {
    const first = form.fields.find((f) => fieldErrors[f.id])
    if (!first) return
    const element =
      document.getElementById(inputId(first)) ??
      document.querySelector<HTMLElement>(`[name="${first.id}"]`)
    element?.focus()
  }

  function setValue(id: string, value: FieldValue): void {
    setValues((prev) => ({ ...prev, [id]: value }))
    // El error de un campo desaparece en cuanto la persona lo corrige.
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const result = validateResponse(form, values)
    if (!result.success) {
      setErrors(result.errors)
      focusFirstError(result.errors)
      return
    }

    setSubmitting(true)
    try {
      const serverErrors = await onSubmit(result.data)
      if (serverErrors) {
        setErrors(serverErrors)
        focusFirstError(serverErrors)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const errorCount = Object.keys(errors).length

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {form.fields.map((field) => {
        const Component = COMPONENTS[field.type]
        return (
          <Component
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(value) => setValue(field.id, value)}
            error={errors[field.id]}
          />
        )
      })}

      {errorCount > 0 && (
        <p className="text-sm font-medium text-red-700" aria-live="polite">
          {errorCount === 1 ? 'Revisa 1 campo marcado.' : `Revisa ${errorCount} campos marcados.`}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="min-h-14 rounded-xl bg-violet-700 px-4 text-lg font-bold text-white transition-colors hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-700/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Enviando…' : submitLabel}
      </button>
    </form>
  )
}
