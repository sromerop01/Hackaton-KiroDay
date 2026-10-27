import FieldShell from './FieldShell'
import { errorId, inputClass, inputId, type FieldProps } from './types'

export default function TextareaField({ field, value, onChange, error }: FieldProps) {
  return (
    <FieldShell field={field} error={error}>
      <textarea
        id={inputId(field)}
        name={field.id}
        rows={4}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.validation?.maxLength}
        aria-required={field.required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(field) : undefined}
        className={inputClass}
      />
    </FieldShell>
  )
}
