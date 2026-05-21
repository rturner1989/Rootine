import { useId } from 'react'
import FormField, { FIELD_INPUT_BASE, FIELD_INPUT_INVALID, FIELD_INPUT_SM, FIELD_INPUT_VALID } from './FormField'

export default function DateInput({
  label,
  labelHidden = false,
  hint,
  error,
  required = false,
  size = 'md',
  min,
  max,
  className = '',
  ...kwargs
}) {
  const inputId = useId()
  const errorId = useId()
  const hintId = useId()
  const hasError = Boolean(error)
  const describedBy = hasError ? errorId : hint ? hintId : undefined
  const inputBase = size === 'sm' ? FIELD_INPUT_SM : FIELD_INPUT_BASE

  return (
    <FormField
      label={label}
      labelHidden={labelHidden}
      required={required}
      hint={hint}
      hintId={hintId}
      error={error}
      errorId={errorId}
      className={className}
    >
      <input
        id={inputId}
        type="date"
        required={required}
        min={min}
        max={max}
        className={`${inputBase} ${hasError ? FIELD_INPUT_INVALID : FIELD_INPUT_VALID}`}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={describedBy}
        {...kwargs}
      />
    </FormField>
  )
}
