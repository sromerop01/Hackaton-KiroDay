'use client'

import { useState } from 'react'
import FormRenderer from '@/components/FormRenderer'
import type { FormSchemaType } from '@/lib/schema'
import type { FieldErrors } from '@/lib/validate'

interface PublicFormProps {
  id: string
  form: FormSchemaType
}

function isFieldErrors(value: unknown): value is FieldErrors {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.values(value).every((v) => typeof v === 'string')
  )
}

export default function PublicForm({ id, form }: PublicFormProps) {
  const [enviado, setEnviado] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  // Cambiar la key reinicia el FormRenderer para enviar otra respuesta.
  const [intento, setIntento] = useState(0)

  async function enviar(values: Record<string, unknown>): Promise<FieldErrors | null> {
    setErrorGeneral(null)
    try {
      const respuesta = await fetch(`/api/forms/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (respuesta.ok) {
        setEnviado(true)
        window.scrollTo({ top: 0 })
        return null
      }
      const cuerpo: unknown = await respuesta.json().catch(() => null)
      if (respuesta.status === 400 && cuerpo && typeof cuerpo === 'object' && 'errors' in cuerpo) {
        const { errors } = cuerpo as { errors: unknown }
        if (isFieldErrors(errors)) return errors
      }
      setErrorGeneral('No pudimos guardar tu respuesta. Intenta de nuevo.')
      return null
    } catch {
      setErrorGeneral('Sin conexión. Revisa tu internet e intenta de nuevo.')
      return null
    }
  }

  if (enviado) {
    return (
      <section role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <div aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-800">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">¡Respuesta enviada!</h2>
        <p className="text-base text-zinc-700">Gracias por diligenciar «{form.title}».</p>
        <button
          type="button"
          onClick={() => {
            setEnviado(false)
            setIntento((n) => n + 1)
          }}
          className="mt-2 min-h-12 rounded-xl border-2 border-violet-700 px-5 text-base font-semibold text-violet-800 hover:bg-violet-50"
        >
          Enviar otra respuesta
        </button>
      </section>
    )
  }

  return (
    <>
      {errorGeneral && (
        <p role="alert" className="mb-4 rounded-lg border-2 border-red-700 bg-red-50 p-3 text-base text-red-800">
          {errorGeneral}
        </p>
      )}
      <FormRenderer key={intento} form={form} onSubmit={enviar} />
    </>
  )
}
