import type { FieldDef } from '@/lib/schema'

export type FieldValue = string | boolean | string[]

export interface FieldProps {
  field: FieldDef
  value: FieldValue | undefined
  onChange: (value: FieldValue) => void
  error?: string
}

// Ids estables para enlazar label, input y mensaje de error.
export function inputId(field: FieldDef): string {
  return `campo-${field.id}`
}

export function errorId(field: FieldDef): string {
  return `campo-${field.id}-error`
}

// Estilo base de los inputs del formulario público: altos, 16 px (evita el
// zoom automático de iOS) y con borde de alto contraste.
export const inputClass =
  'block min-h-12 w-full rounded-lg border-2 border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/30 aria-[invalid=true]:border-red-700'
