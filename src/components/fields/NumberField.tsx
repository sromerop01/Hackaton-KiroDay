import FieldShell from './FieldShell'
import { errorId, inputClass, inputId, type FieldProps } from './types'

export default function NumberField({ field, value, onChange, error }: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <input
        id={inputId(field)}
        name={field.id}
        type="number"
        inputMode="decimal"
        step="any"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        min={field.validation?.min}
        max={field.validation?.max}
        aria-required={field.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(field) : undefined}
        className={inputClass}
      />
    </FieldShell>
  )
}
