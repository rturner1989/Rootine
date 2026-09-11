import type { ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { useId } from 'react'
import FormField, { FIELD_INPUT_BASE, FIELD_INPUT_INVALID, FIELD_INPUT_VALID } from './FormField'

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  label: ReactNode
  labelHidden?: boolean
  hint?: ReactNode
  error?: string | null
  className?: string
  ref?: Ref<HTMLSelectElement>
}

export default function Select({
  label,
  labelHidden = false,
  hint,
  error,
  required = false,
  className = '',
  ref,
  children,
  ...kwargs
}: SelectProps) {
  const inputId = useId()
  const errorId = useId()
  const hintId = useId()
  const hasError = Boolean(error)
  const describedBy = hasError ? errorId : hint ? hintId : undefined

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
      <select
        ref={ref}
        id={inputId}
        required={required}
        className={`${FIELD_INPUT_BASE} ${hasError ? FIELD_INPUT_INVALID : FIELD_INPUT_VALID}`}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={describedBy}
        {...kwargs}
      >
        {children}
      </select>
    </FormField>
  )
}
