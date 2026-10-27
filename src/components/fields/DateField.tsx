import FieldShell from './FieldShell'
import { errorId, inputClass, inputId, type FieldProps } from './types'

export default function DateField({ field, value, onChange, error }: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <input
        id={inputId(field)}
        name={field.id}
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        aria-required={field.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(field) : undefined}
        className={inputClass}
      />
    </FieldShell>
  )
}
