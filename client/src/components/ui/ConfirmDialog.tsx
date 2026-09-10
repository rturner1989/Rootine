import type { FormEvent, ReactNode, RefObject } from 'react'
import { useEffect, useId, useRef } from 'react'
import Action from './Action'
import Card from './Card'
import Dialog from './Dialog'

type InitialFocusTarget = 'confirm' | 'cancel'

export type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm?: () => unknown
  title: string
  message?: ReactNode
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  confirmDisabled?: boolean
  loading?: boolean
  loadingLabel?: string
  initialFocus?: InitialFocusTarget
  initialFocusRef?: RefObject<HTMLElement | null>
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirmDisabled = false,
  loading = false,
  loadingLabel,
  initialFocus,
  initialFocusRef,
}: ConfirmDialogProps) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Destructive flows default focus to Cancel (a11y — prevents
  // accidental Enter-deletes). Override via `initialFocus` ('confirm')
  // or `initialFocusRef` (a child input ref, e.g. Delete dialog's
  // type-to-confirm input where typing IS the safety gate).
  const focusTarget = initialFocusRef ? 'custom' : (initialFocus ?? (destructive ? 'cancel' : 'confirm'))

  useEffect(() => {
    if (!open) return
    let node: HTMLElement | null
    if (focusTarget === 'custom') node = initialFocusRef?.current ?? null
    else if (focusTarget === 'cancel') node = cancelRef.current
    else node = confirmRef.current
    if (!node) return
    const target = node
    const frame = requestAnimationFrame(() => target.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, focusTarget, initialFocusRef])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirmDisabled || loading) return
    try {
      const result = onConfirm?.()
      // onConfirm's return is `unknown` (sync or async, consumer's choice) —
      // duck-typed thenable check same as the original, cast only to read
      // `.then` off a value TS otherwise won't let us access properties on.
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        await result
      }
    } catch {
      // Consumer's onConfirm reported the error (toast, log). Stay
      // open so the user can retry. Swallow here so the rejection
      // doesn't surface as an unhandled promise warning.
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} ariaLabelledBy={titleId}>
      <Card.Header divider={false}>
        <p id={titleId} className="text-lg font-extrabold text-ink pr-10">
          {title}
        </p>
      </Card.Header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Body className="!flex-none flex flex-col gap-4">
          {message && <p className="text-sm text-ink-soft leading-snug">{message}</p>}
          {children}
        </Card.Body>

        <Card.Footer divider={false} className="flex justify-end gap-2.5">
          <Action ref={cancelRef} type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Action>
          <Action
            ref={confirmRef}
            type="submit"
            variant={destructive ? 'danger' : 'primary'}
            disabled={confirmDisabled || loading}
          >
            {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
          </Action>
        </Card.Footer>
      </form>
    </Dialog>
  )
}
