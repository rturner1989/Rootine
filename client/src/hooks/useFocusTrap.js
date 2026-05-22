import { useEffect } from 'react'

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Trap Tab / Shift+Tab within `containerRef` while `active`, so keyboard
// focus can't leak to background DOM behind a modal surface (WCAG 2.4.3,
// WAI-ARIA APG modal pattern). Escape, initial focus, and focus restore
// are deliberately left to the caller — they differ per surface (Dialog
// restores to the previously-focused node and skips iOS text inputs;
// Popover restores to its anchor trigger).
export default function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active) return

    function handleTab(event) {
      if (event.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusables = container.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const focused = document.activeElement

      if (event.shiftKey && (focused === first || focused === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [active, containerRef])
}
