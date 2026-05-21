const LABEL_TEXT = 'block eyebrow-label text-ink-soft'

// text-base (16px) — iOS Safari auto-zooms into any input below 16px on
// focus and doesn't zoom back out. focus:ring-inset keeps the focus ring
// inside the border so it isn't clipped by overflow-hidden containers
// (Dialog, scrollable Card.Body).
export const FIELD_INPUT_BASE =
  'w-full px-4 py-2 rounded-md bg-paper border-[1.5px] text-ink text-base font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-inset'
// Compact: tighter padding + a lighter ring for dense surfaces (the
// journal filter popover). Keeps text-base — dropping below 16px would
// reintroduce the iOS focus-zoom this primitive exists to avoid.
export const FIELD_INPUT_SM =
  'w-full px-3 py-1.5 rounded-md bg-paper border-[1.5px] text-ink text-base font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-inset'
export const FIELD_INPUT_VALID = 'border-paper-edge focus:border-emerald focus:ring-emerald/15'
export const FIELD_INPUT_INVALID = 'border-coral focus:border-coral focus:ring-coral/20'

export default function FormField({
  label,
  labelHidden = false,
  required = false,
  hint,
  hintId,
  error,
  errorId,
  className = '',
  children,
}) {
  const hasError = Boolean(error)

  return (
    <div className={`block ${className}`}>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: control is the rendered child (input/select/textarea), passed via children — biome can't statically see through it */}
      <label className="block">
        <span className={labelHidden ? 'sr-only' : `mb-1.5 ${LABEL_TEXT}`}>
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-coral-deep">
              *
            </span>
          )}
        </span>
        {children}
      </label>
      {hasError ? (
        <span id={errorId} className="mt-1 block text-xs font-semibold text-coral-deep">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="mt-1 block text-xs text-ink-soft">
            {hint}
          </span>
        )
      )}
    </div>
  )
}
