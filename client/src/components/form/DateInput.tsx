import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { useId } from 'react'
import FormField, { FIELD_INPUT_BASE, FIELD_INPUT_INVALID, FIELD_INPUT_SM, FIELD_INPUT_VALID } from './FormField'

export type DateInputSize = 'sm' | 'md'

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'min' | 'max' | 'size'> & {
  label: ReactNode
  labelHidden?: boolean
  hint?: ReactNode
  error?: string | null
  size?: DateInputSize
  min?: string
  max?: string
  className?: string
  ref?: Ref<HTMLInputElement>
}

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
  ref,
  ...kwargs
}: DateInputProps) {
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
        ref={ref}
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
