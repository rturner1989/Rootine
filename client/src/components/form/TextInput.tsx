import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { useId } from 'react'
import FormField, { FIELD_INPUT_BASE, FIELD_INPUT_INVALID, FIELD_INPUT_VALID } from './FormField'

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: ReactNode
  labelHidden?: boolean
  hint?: ReactNode
  error?: string | null
  className?: string
  ref?: Ref<HTMLInputElement>
}

// useId for the input id so Chrome/Brave's autofill machinery has
// something to anchor against — without it they warn "form field
// element has neither an id nor a name attribute".
export default function TextInput({
  label,
  labelHidden = false,
  hint,
  error,
  required = false,
  className = '',
  ref,
  ...kwargs
}: TextInputProps) {
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
      <input
        ref={ref}
        id={inputId}
        required={required}
        className={`${FIELD_INPUT_BASE} ${hasError ? FIELD_INPUT_INVALID : FIELD_INPUT_VALID}`}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={describedBy}
        {...kwargs}
      />
    </FormField>
  )
}
