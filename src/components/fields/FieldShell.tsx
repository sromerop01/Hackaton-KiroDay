import type { ReactNode } from 'react'
import type { FieldDef } from '@/lib/schema'
import { errorId, inputId } from './types'

interface FieldShellProps {
  field: FieldDef
  error?: string
  // Los grupos (radios y casillas múltiples) usan fieldset/legend en lugar de label.
  group?: boolean
  children: ReactNode
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-red-700">
        {' '}*
      </span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  )
}

export default function FieldShell({ field, error, group = false, children }: FieldShellProps) {
  const labelText = (
    <>
      {field.label}
      {field.required && <RequiredMark />}
    </>
  )
  const errorMessage = error && (
    <p id={errorId(field)} role="alert" className="mt-2 text-sm font-medium text-red-700">
      {error}
    </p>
  )

  if (group) {
    return (
      <fieldset aria-describedby={error ? errorId(field) : undefined}>
        <legend className="mb-2 text-base font-semibold text-zinc-900">{labelText}</legend>
        {children}
        {errorMessage}
      </fieldset>
    )
  }

  return (
    <div>
      <label htmlFor={inputId(field)} className="mb-2 block text-base font-semibold text-zinc-900">
        {labelText}
      </label>
      {children}
      {errorMessage}
    </div>
  )
}
