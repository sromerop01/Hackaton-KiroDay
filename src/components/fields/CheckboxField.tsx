import FieldShell from './FieldShell'
import { errorId, inputId, type FieldProps } from './types'

const optionClass =
  'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 border-zinc-300 bg-white px-3 text-base text-zinc-900 has-[:checked]:border-violet-700 has-[:checked]:bg-violet-50'

export default function CheckboxField({ field, value, onChange, error }: FieldProps) {
  const options = field.options ?? []

  // Sin opciones: una sola casilla booleana ("Acepto…"), con la etiqueta al lado.
  if (options.length === 0) {
    return (
      <div>
        <label htmlFor={inputId(field)} className={optionClass}>
          <input
            id={inputId(field)}
            name={field.id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            aria-required={field.required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId(field) : undefined}
            className="size-5 shrink-0 accent-violet-700"
          />
          <span className="font-semibold">
            {field.label}
            {field.required && (
              <>
                <span aria-hidden="true" className="text-red-700"> *</span>
                <span className="sr-only"> (obligatorio)</span>
              </>
            )}
          </span>
        </label>
        {error && (
          <p id={errorId(field)} role="alert" className="mt-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    )
  }

  const selected = Array.isArray(value) ? value : []

  function toggle(option: string, checked: boolean): void {
    // Se conserva el orden de las opciones, no el de los clics.
    const next = checked ? [...selected, option] : selected.filter((o) => o !== option)
    onChange(options.filter((o) => next.includes(o)))
  }

  return (
    <FieldShell field={field} error={error} group>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option} className={optionClass}>
            <input
              type="checkbox"
              name={field.id}
              value={option}
              checked={selected.includes(option)}
              onChange={(e) => toggle(option, e.target.checked)}
              aria-invalid={Boolean(error)}
              className="size-5 shrink-0 accent-violet-700"
            />
            {option}
          </label>
        ))}
      </div>
    </FieldShell>
  )
}
