import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Portal-based bubble — escapes ancestor `overflow: hidden` and DOM
// paint-order occlusion that an in-tree absolute element would hit.
// Caller drops `<Tooltip>` as the last child of the trigger element;
// the component hooks the parent's hover + focus events to show.

const OFFSET = 6

function positionFor(placement, rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  switch (placement) {
    case 'top':
      return { bottom: vh - rect.top + OFFSET, left: cx, transform: 'translateX(-50%)' }
    case 'top-start':
      return { bottom: vh - rect.top + OFFSET, left: rect.left }
    case 'top-end':
      return { bottom: vh - rect.top + OFFSET, right: vw - rect.right }
    case 'bottom':
      return { top: rect.bottom + OFFSET, left: cx, transform: 'translateX(-50%)' }
    case 'bottom-start':
      return { top: rect.bottom + OFFSET, left: rect.left }
    case 'bottom-end':
      return { top: rect.bottom + OFFSET, right: vw - rect.right }
    case 'left':
      return { right: vw - rect.left + OFFSET, top: cy, transform: 'translateY(-50%)' }
    case 'right':
      return { left: rect.right + OFFSET, top: cy, transform: 'translateY(-50%)' }
    default:
      return { top: rect.bottom + OFFSET, left: cx, transform: 'translateX(-50%)' }
  }
}

export default function Tooltip({ placement = 'bottom', className = '', children }) {
  const anchorRef = useRef(null)
  const bubbleId = useId()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)

  // focusin / focusout (not focus / blur) so child focus inside the
  // trigger also reveals the tooltip — and they bubble, which `focus`
  // doesn't.
  //
  // A touch tap focuses the trigger and emulates mouseenter, so an ungated
  // tooltip popped on tap and lingered over the dialog the tap opened (no
  // pointer-leave on touch to dismiss it). The tooltip is a hover/keyboard
  // affordance, so gate showing on real hover capability — touch devices
  // report `hover: none`, and the trigger's aria-label still names it for
  // SR/keyboard users on those devices.
  useEffect(() => {
    const trigger = anchorRef.current?.parentElement
    if (!trigger) return

    const hide = () => setOpen(false)
    const show = () => {
      if (window.matchMedia('(hover: hover)').matches) setOpen(true)
    }

    trigger.addEventListener('mouseenter', show)
    trigger.addEventListener('mouseleave', hide)
    trigger.addEventListener('focusin', show)
    trigger.addEventListener('focusout', hide)
    return () => {
      trigger.removeEventListener('mouseenter', show)
      trigger.removeEventListener('mouseleave', hide)
      trigger.removeEventListener('focusin', show)
      trigger.removeEventListener('focusout', hide)
    }
  }, [])

  // Wire aria-describedby on the trigger when the tooltip is open so
  // SR users hear the bubble content. Removed on hide so closed
  // tooltips don't leak descriptions onto the trigger.
  useEffect(() => {
    const trigger = anchorRef.current?.parentElement
    if (!trigger) return
    if (open) {
      trigger.setAttribute('aria-describedby', bubbleId)
      return () => trigger.removeAttribute('aria-describedby')
    }
  }, [open, bubbleId])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const trigger = anchorRef.current?.parentElement
    if (!trigger) return

    const update = () => setPosition(positionFor(placement, trigger.getBoundingClientRect()))
    update()

    // `true` for capture so nested scroll containers also fire.
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, placement])

  return (
    <>
      <span ref={anchorRef} aria-hidden="true" style={{ display: 'none' }} />
      {open &&
        position &&
        createPortal(
          <span
            id={bubbleId}
            role="tooltip"
            style={{ position: 'fixed', zIndex: 9999, ...position }}
            className={`px-2.5 py-1 rounded-full bg-ink text-paper text-[11px] font-bold whitespace-nowrap shadow-md pointer-events-none ${className}`}
          >
            {children}
          </span>,
          document.body,
        )}
    </>
  )
}
