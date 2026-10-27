'use client'

import type { FieldKind } from '@/lib/schema'
import { TYPE_LABELS, usesOptions, type EditableField } from './types'

interface FieldEditorProps {
  index: number
  total: number
  value: EditableField
  onChange: (value: EditableField) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

const inputClass =
  'block min-h-12 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-base text-zinc-100 focus:border-[#7CFF3A] focus:outline-none focus:ring-2 focus:ring-[#7CFF3A]/30'

const iconButton =
  'flex size-11 items-center justify-center rounded-lg border border-zinc-600 text-lg text-zinc-200 hover:bg-zinc-800 disabled:opacity-30'

export default function FieldEditor({ index, total, value, onChange, onMove, onRemove }: FieldEditorProps) {
  const { field, optionsText } = value
  const prefix = `campo-${index}`

  function update(patch: Partial<EditableField['field']>): void {
    onChange({ ...value, field: { ...field, ...patch } })
  }

  return (
    <li className="rounded-xl border border-[#A855F7]/40 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#A855F7]">Campo {index + 1}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Subir campo ${index + 1}`} className={iconButton}>
            ↑
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Bajar campo ${index + 1}`} className={iconButton}>
            ↓
          </button>
          <button type="button" onClick={onRemove} aria-label={`Eliminar campo ${index + 1}`} className={`${iconButton} text-[#FB923C]`}>
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor={`${prefix}-label`} className="mb-1 block text-sm text-zinc-300">
            Etiqueta
          </label>
          <input
            id={`${prefix}-label`}
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${prefix}-type`} className="mb-1 block text-sm text-zinc-300">
            Tipo
          </label>
          <select
            id={`${prefix}-type`}
            value={field.type}
            onChange={(e) => update({ type: e.target.value as FieldKind })}
            className={inputClass}
          >
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {usesOptions(field.type) && (
          <div>
            <label htmlFor={`${prefix}-options`} className="mb-1 block text-sm text-zinc-300">
              Opciones (una por línea)
            </label>
            <textarea
              id={`${prefix}-options`}
              rows={3}
              value={optionsText}
              onChange={(e) => onChange({ ...value, optionsText: e.target.value })}
              aria-describedby={field.type === 'checkbox' ? `${prefix}-options-help` : undefined}
              className={inputClass}
            />
            {field.type === 'checkbox' && (
              <p id={`${prefix}-options-help`} className="mt-1 text-xs text-zinc-400">
                Déjalo vacío para una sola casilla, como «Acepto los términos».
              </p>
            )}
          </div>
        )}

        {/* Interruptor grande: es el ajuste que más se corrige tras la extracción. */}
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-700 px-3">
          <span className="text-base text-zinc-100">Obligatorio</span>
          <input
            type="checkbox"
            role="switch"
            aria-label={`Obligatorio: ${field.label || `campo ${index + 1}`}`}
            checked={field.required}
            onChange={(e) => update({ required: e.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-8 w-14 shrink-0 rounded-full bg-zinc-700 transition-colors after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#7CFF3A] peer-checked:after:translate-x-6 peer-focus-visible:ring-2 peer-focus-visible:ring-[#7CFF3A]"
          />
        </label>
      </div>
    </li>
  )
}
