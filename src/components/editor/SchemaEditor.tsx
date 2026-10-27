'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormSchema, type FormSchemaType, type FormStatusType } from '@/lib/schema'
import { describeSchemaIssues } from '@/lib/schemaErrors'
import FieldEditor from './FieldEditor'
import { buildForm, newField, toEditable, type EditableField } from './types'

interface SchemaEditorProps {
  id: string
  adminKey: string
  initial: FormSchemaType
  status: FormStatusType
}

type Accion = 'guardar' | 'publicar' | null

const inputClass =
  'block min-h-12 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-base text-zinc-100 focus:border-acid focus:outline-none focus:ring-2 focus:ring-acid/30'

export default function SchemaEditor({ id, adminKey, initial, status }: SchemaEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description ?? '')
  const [fields, setFields] = useState<EditableField[]>(() => initial.fields.map(toEditable))
  const [errores, setErrores] = useState<string[]>([])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [accion, setAccion] = useState<Accion>(null)

  function cambiar(next: EditableField[]): void {
    setFields(next)
    setMensaje(null)
  }

  function mover(index: number, direction: -1 | 1): void {
    const next = [...fields]
    const target = index + direction
    ;[next[index], next[target]] = [next[target], next[index]]
    cambiar(next)
  }

  async function enviar(nuevoEstado: FormStatusType): Promise<void> {
    const form = buildForm(title, description, fields)
    const parsed = FormSchema.safeParse(form)
    if (!parsed.success) {
      setErrores(describeSchemaIssues(parsed.error))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrores([])
    setMensaje(null)
    setAccion(nuevoEstado === 'publicado' ? 'publicar' : 'guardar')
    try {
      const respuesta = await fetch(`/api/forms/${id}?k=${encodeURIComponent(adminKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: parsed.data, status: nuevoEstado }),
      })
      if (!respuesta.ok) {
        const cuerpo: unknown = await respuesta.json().catch(() => null)
        const lista =
          cuerpo && typeof cuerpo === 'object' && 'errors' in cuerpo && Array.isArray(cuerpo.errors)
            ? cuerpo.errors.filter((e): e is string => typeof e === 'string')
            : []
        setErrores(lista.length > 0 ? lista : ['No pudimos guardar los cambios. Intenta de nuevo.'])
        return
      }
      if (nuevoEstado === 'publicado') {
        router.push(`/f/${id}/publicado?k=${encodeURIComponent(adminKey)}`)
        return
      }
      setMensaje('Cambios guardados.')
    } catch {
      setErrores(['Sin conexión. Revisa tu internet e intenta de nuevo.'])
    } finally {
      setAccion(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {errores.length > 0 && (
        <div role="alert" className="rounded-lg border border-orange/60 bg-orange/10 p-3 text-sm text-orange">
          <p className="mb-1 font-semibold">Revisa antes de continuar:</p>
          <ul className="list-inside list-disc">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="titulo" className="mb-1 block text-sm text-zinc-300">
            Título del formulario
          </label>
          <input id="titulo" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="descripcion" className="mb-1 block text-sm text-zinc-300">
            Descripción (opcional)
          </label>
          <textarea
            id="descripcion"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {fields.map((value, index) => (
          <FieldEditor
            key={value.field.id}
            index={index}
            total={fields.length}
            value={value}
            onChange={(next) => cambiar(fields.map((f, i) => (i === index ? next : f)))}
            onMove={(direction) => mover(index, direction)}
            onRemove={() => cambiar(fields.filter((_, i) => i !== index))}
          />
        ))}
      </ol>

      <button
        type="button"
        onClick={() => cambiar([...fields, newField(fields)])}
        className="min-h-12 rounded-xl border-2 border-dashed border-purple text-base font-semibold text-zinc-100 hover:bg-purple/10"
      >
        + Agregar campo
      </button>

      {mensaje && (
        <p role="status" className="text-center text-sm text-acid">
          {mensaje}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-zinc-800 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => enviar(status)}
          disabled={accion !== null}
          className="min-h-12 flex-1 rounded-xl border border-zinc-500 text-base font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
        >
          {accion === 'guardar' ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => enviar('publicado')}
          disabled={accion !== null}
          className="min-h-12 flex-[2] rounded-xl bg-acid text-base font-black text-black hover:opacity-90 disabled:opacity-50"
        >
          {accion === 'publicar' ? 'Publicando…' : status === 'publicado' ? 'Guardar y ver enlace' : '¡Está vivo! Publicar'}
        </button>
      </div>
    </div>
  )
}
