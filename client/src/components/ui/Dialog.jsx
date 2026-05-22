import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import useFocusTrap from '../../hooks/useFocusTrap'
import Action from './Action'
import Card from './Card'
import Heading from './Heading'

const MotionCard = motion.create(Card)

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
}

const desktopCardMotion = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.98 },
  transition: { duration: 0.22, ease: [0.33, 1, 0.68, 1] },
}

const mobileCardMotion = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: '100%' },
  transition: { duration: 0.26, ease: [0.33, 1, 0.68, 1] },
}

const rightDrawerMotion = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: 0.28, ease: [0.33, 1, 0.68, 1] },
}

function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1023px)').matches
}

export default function Dialog({
  open,
  onClose,
  title,
  ariaLabelledBy,
  children,
  className = '',
  placement = 'center',
  scrim,
  cardVariant = 'solid',
}) {
  const isRight = placement === 'right'
  // Center placement defaults to a dimmed scrim. Right drawer defaults to
  // no scrim (Mac-notification-centre style — main content visible behind)
  // but stays click-to-close via a transparent overlay.
  const showScrim = scrim ?? !isRight
  const cardRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const dragControls = useDragControls()
  const isMobile = isMobileViewport()
  const shouldReduceMotion = useReducedMotion()
  const baseMotion = isRight ? rightDrawerMotion : isMobile ? mobileCardMotion : desktopCardMotion
  const cardMotion = shouldReduceMotion ? { ...baseMotion, transition: { duration: 0 } } : baseMotion
  const allowDrag = !isRight && isMobile

  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Blur the focused element BEFORE flipping `open` to false. On iOS
  // the keyboard belongs to whichever input has focus; closing the
  // dialog while a text input is focused makes the keyboard flicker
  // open/closed during the unmount. Blurring first dismisses the
  // keyboard cleanly, then we run the consumer's onClose.
  const requestClose = useCallback(() => {
    if (
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement &&
      typeof document.activeElement.blur === 'function'
    ) {
      document.activeElement.blur()
    }
    onCloseRef.current?.()
  }, [])

  // Tab-wrap lives in useFocusTrap; this effect owns the rest of the
  // modal focus contract — Escape to close, initial focus into the card,
  // and restoring focus to the previously-focused node on close.
  useFocusTrap(cardRef, open)

  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement
    cardRef.current?.focus()

    function handleEscape(event) {
      if (event.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      // Restoring focus to a text input would re-open the iOS keyboard
      // mid-close — skip those targets and let the next interaction
      // place focus naturally.
      const target = previouslyFocusedRef.current
      if (
        target &&
        typeof target.focus === 'function' &&
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        target.focus()
      }
    }
  }, [open, requestClose])

  function handleDragEnd(_event, info) {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      requestClose()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="dialog-root">
          <motion.button
            type="button"
            aria-label="Close dialog"
            className={showScrim ? 'dialog-overlay' : 'dialog-overlay dialog-overlay-transparent'}
            onClick={requestClose}
            {...overlayMotion}
          />
          <div className={isRight ? 'dialog-content dialog-content-right' : 'dialog-content'}>
            <MotionCard
              ref={cardRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={ariaLabelledBy ?? (title ? titleId : undefined)}
              tabIndex={-1}
              variant={cardVariant}
              className={`relative shadow-[var(--shadow-md)] flex flex-col min-h-0 px-6 pt-2 pb-6 gap-4 sm:pt-6 outline-none ${className}`}
              drag={allowDrag ? 'y' : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              {...cardMotion}
            >
              {allowDrag && (
                <Action
                  variant="unstyled"
                  aria-label="Drag to dismiss"
                  className="dialog-handle-wrapper"
                  onPointerDown={(event) => dragControls.start(event)}
                >
                  <span aria-hidden="true" className="dialog-handle" />
                </Action>
              )}
              {title && !ariaLabelledBy && (
                <Heading as="h2" variant="card" id={titleId} className="sr-only">
                  {title}
                </Heading>
              )}
              {/* Close button rendered before children so it lands first
                  in the focus-trap tab order — keyboard users escape
                  with one Tab + Enter, no full content cycle. */}
              <Action
                variant="unstyled"
                onClick={requestClose}
                aria-label={title ? `Close ${title}` : 'Close'}
                className={`absolute right-3 w-7 h-7 rounded-full bg-ink/[0.08] text-ink-soft hover:text-ink hover:bg-ink/[0.12] transition-colors flex items-center justify-center z-10 ${
                  isRight ? 'top-[max(0.75rem,env(safe-area-inset-top))]' : 'top-3'
                }`}
              >
                <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
              </Action>
              {children}
            </MotionCard>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
