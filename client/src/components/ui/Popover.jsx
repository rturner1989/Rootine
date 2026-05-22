import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useFocusTrap, { FOCUSABLE_SELECTOR } from '../../hooks/useFocusTrap'

// Anchored popover panel. Two positioning modes:
//
//   in-flow (default) — `position: absolute` relative to a `relative`
//     ancestor. Use for in-card surfaces with no overflow constraints.
//
//   portal — `createPortal(document.body)` + `position: fixed` keyed to
//     the anchor's getBoundingClientRect. Use for dropdowns that need
//     to escape overflow/transform containers (e.g. overflow menus
//     inside a scroll area).
//
// Parent owns `open` + the anchor element (passed as `anchorRef` so the
// outside-click handler can ignore the trigger).

const OFFSET = 6
const PORTAL_Z = 50

const SURFACE_CLASS = {
  panel: 'action-surface-panel',
  glass: 'glass-card rounded-md',
  'glass-dense': 'glass-card-dense rounded-md',
}

const PLACEMENT_ORIGIN = {
  'bottom-left': 'origin-top-left',
  'bottom-right': 'origin-top-right',
  'top-left': 'origin-bottom-left',
  'top-right': 'origin-bottom-right',
}

const PLACEMENT_INFLOW_POSITION = {
  'bottom-left': 'absolute top-full left-0 mt-2 z-30',
  'bottom-right': 'absolute top-full right-0 mt-2 z-30',
  'top-left': 'absolute bottom-full left-0 mb-2 z-30',
  'top-right': 'absolute bottom-full right-0 mb-2 z-30',
}

function positionFromRect(placement, rect) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  switch (placement) {
    case 'bottom-left':
      return { top: rect.bottom + OFFSET, left: rect.left }
    case 'top-right':
      return { bottom: viewportHeight - rect.top + OFFSET, right: viewportWidth - rect.right }
    case 'top-left':
      return { bottom: viewportHeight - rect.top + OFFSET, left: rect.left }
    default:
      return { top: rect.bottom + OFFSET, right: viewportWidth - rect.right }
  }
}

export default function Popover({
  open,
  onClose,
  anchorRef,
  panelRef: externalPanelRef,
  id,
  role = 'dialog',
  label,
  placement = 'bottom-left',
  portal = false,
  surface = 'panel',
  autoFocus = false,
  modal = false,
  className = '',
  children,
}) {
  const internalPanelRef = useRef(null)
  const panelRef = externalPanelRef ?? internalPanelRef
  const shouldReduceMotion = useReducedMotion()
  const [portalPosition, setPortalPosition] = useState(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event) {
      if (panelRef.current?.contains(event.target)) return
      if (anchorRef?.current?.contains(event.target)) return
      onClose?.({ reason: 'outside' })
    }
    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.({ reason: 'escape' })
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose, anchorRef, panelRef])

  // WAI-ARIA APG dialog pattern — move focus into the panel on open so
  // keyboard users land inside. RAF defer so the portal-positioned panel
  // (one re-render after layout-effect) is mounted before we query.
  useEffect(() => {
    if (!open || !autoFocus) return
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const target = panel.querySelector(FOCUSABLE_SELECTOR)
      target?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open, autoFocus, panelRef])

  // Modal dialogs trap Tab so focus can't leak to the background. Menus
  // opt out — role="menu" owns its own arrow-key model and Tab is meant
  // to exit a menu.
  useFocusTrap(panelRef, open && modal)

  // Return focus to the trigger on close so keyboard users don't get
  // dumped at the top of the document. Cleanup fires on the open→false
  // transition; capturing the anchor at effect-run keeps it stable.
  useEffect(() => {
    if (!open || !modal) return
    const trigger = anchorRef?.current
    return () => trigger?.focus?.()
  }, [open, modal, anchorRef])

  // Portal mode anchors to the trigger's bounding rect. useLayoutEffect
  // to avoid a one-frame flash at (0,0). Capture-phase scroll listener
  // so nested scroll containers also re-anchor.
  useLayoutEffect(() => {
    if (!portal || !open) {
      setPortalPosition(null)
      return
    }
    const anchor = anchorRef?.current
    if (!anchor) return
    const update = () => setPortalPosition(positionFromRect(placement, anchor.getBoundingClientRect()))
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [portal, open, placement, anchorRef])

  const originClass = PLACEMENT_ORIGIN[placement] ?? PLACEMENT_ORIGIN['bottom-left']
  const inflowPositionClass = PLACEMENT_INFLOW_POSITION[placement] ?? PLACEMENT_INFLOW_POSITION['bottom-left']
  const surfaceClass = SURFACE_CLASS[surface] ?? SURFACE_CLASS.panel

  const motionProps = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.95, y: -4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -4 },
        transition: { duration: 0.14, ease: [0.33, 1, 0.68, 1] },
      }

  const shouldRender = open && (!portal || portalPosition != null)

  const wrapperClass = portal ? `${originClass} ${className}` : `${inflowPositionClass} ${originClass} ${className}`

  const panel = (
    <motion.div
      ref={panelRef}
      id={id}
      role={role}
      aria-modal={modal || undefined}
      aria-label={label}
      style={portal ? { position: 'fixed', zIndex: PORTAL_Z, ...portalPosition } : undefined}
      className={`${surfaceClass} ${wrapperClass}`}
      {...motionProps}
    >
      {children}
    </motion.div>
  )

  const tree = <AnimatePresence>{shouldRender && panel}</AnimatePresence>

  return portal ? createPortal(tree, document.body) : tree
}
