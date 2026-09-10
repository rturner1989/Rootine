import type { ReactNode } from 'react'
import Dialog from './Dialog'

export type DrawerProps = {
  open: boolean
  onClose?: () => void
  title?: string
  scrim?: boolean
  children?: ReactNode
  className?: string
}

// Right-side glass drawer — Mac-notification-centre style. Composes
// Dialog with the floating-glass vessel styling baked in so consumers
// don't override Card internals via `!bg-transparent !border-0` leaks.
//
// Used by the notifications drawer + future Today desktop organiser
// column. Same visual vocabulary across both per mockup 17 + 30.
//
// Scrim defaults to false (Mac-notification-centre style) — main content
// stays fully visible behind. Click-outside-to-close still works via a
// transparent overlay. Set scrim={true} when the drawer should dim the
// scene (e.g. modal-flavoured drawers).
export default function Drawer({ open, onClose, title, scrim = false, children, className = '' }: DrawerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      placement="right"
      scrim={scrim}
      cardVariant="glass"
      className={`!p-0 !gap-0 bg-paper/[0.92] ${className}`}
    >
      {children}
    </Dialog>
  )
}
