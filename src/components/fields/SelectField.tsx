import FieldShell from './FieldShell'
import { errorId, inputClass, inputId, type FieldProps } from './types'

// Con pocas opciones, botones de radio grandes son más fáciles de tocar en el
// celular que un desplegable.
const MAX_RADIO_OPTIONS = 5

export default function SelectField({ field, value, onChange, error }: FieldProps) {
  const options = field.options ?? []
  const selected = typeof value === 'string' ? value : ''

  if (options.length <= MAX_RADIO_OPTIONS) {
    return (
      <FieldShell field={field} error={error} group>
        <div
          role="radiogroup"
          aria-required={field.required}
          aria-invalid={Boolean(error)}
          className="flex flex-col gap-2"
        >
          {options.map((option) => (
            <label
              key={option}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 border-zinc-300 bg-white px-3 text-base text-zinc-900 has-[:checked]:border-violet-700 has-[:checked]:bg-violet-50"
            >
              <input
                type="radio"
                name={field.id}
                value={option}
                checked={selected === option}
                onChange={() => onChange(option)}
                className="size-5 accent-violet-700"
              />
              {option}
            </label>
          ))}
        </div>
      </FieldShell>
    )
  }

  return (
    <FieldShell field={field} error={error}>
      <select
        id={inputId(field)}
        name={field.id}
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-required={field.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(field) : undefined}
        className={inputClass}
      >
        <option value="">Elige una opción</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
