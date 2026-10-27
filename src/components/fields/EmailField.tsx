import FieldShell from './FieldShell'
import { errorId, inputClass, inputId, type FieldProps } from './types'

export default function EmailField({ field, value, onChange, error }: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <input
        id={inputId(field)}
        name={field.id}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? 'nombre@ejemplo.com'}
        aria-required={field.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(field) : undefined}
        className={inputClass}
      />
    </FieldShell>
  )
}
