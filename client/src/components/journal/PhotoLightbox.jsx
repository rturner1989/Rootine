import { faChevronLeft, faChevronRight, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatLongDate } from '../../utils/dates'
import Action from '../ui/Action'

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
// One pill for every lightbox control. Opaque (not translucent) so the
// prev/next arrows stay legible where they overlay the photo on mobile —
// and so close/delete read the same as the arrows on the light backdrop.
const CONTROL =
  'flex items-center justify-center rounded-full bg-paper/90 text-ink ring-1 ring-ink/10 shadow-warm-sm hover:bg-paper transition-colors'

// Fullscreen photo viewer. Focus management mirrors Dialog (focus the
// close button on open, trap Tab, restore focus to the opener on close)
// — Dialog's own trap is baked into its Card chrome, so a full-bleed
// image viewer replicates the pattern rather than reusing it.
export default function PhotoLightbox({ photo, onClose, onDelete, onPrev, onNext, hasPrev = false, hasNext = false }) {
  const open = Boolean(photo)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const restoreRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  // Focus the close button on open; restore focus to the opener (the
  // clicked tile) on close. Deps [open] only — stepping prev/next keeps
  // open=true so this doesn't re-fire and steal focus mid-browse.
  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    const frame = requestAnimationFrame(() => closeRef.current?.focus())
    return () => {
      cancelAnimationFrame(frame)
      const target = restoreRef.current
      if (target && typeof target.focus === 'function') target.focus()
    }
  }, [open])

  // Keyboard: Escape closes, arrows step, Tab traps within the panel.
  useEffect(() => {
    if (!open) return
    function handleKey(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft' && hasPrev) {
        onPrev()
        return
      }
      if (event.key === 'ArrowRight' && hasNext) {
        onNext()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll(FOCUSABLE)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, onPrev, onNext, hasPrev, hasNext])

  const overlayMotion = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18, ease: 'easeOut' },
      }

  const imageMotion = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.97 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.97 },
        transition: { duration: 0.2, ease: [0.33, 1, 0.68, 1] },
      }

  const canSwipe = hasPrev || hasNext

  // Swipe (touch) + drag (mouse) to step. Left past threshold → next,
  // right → prev; velocity flick counts too. Snaps back otherwise.
  function handleDragEnd(_event, info) {
    if ((info.offset.x <= -80 || info.velocity.x <= -500) && hasNext) {
      onNext()
    } else if ((info.offset.x >= 80 || info.velocity.x >= 500) && hasPrev) {
      onPrev()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 backdrop-blur-sm"
          {...overlayMotion}
        >
          {/* Backdrop — mouse click-to-close only. Not tabbable + aria-hidden
              so it stays outside the panel's focus trap and doesn't duplicate
              the labelled close button. Keyboard users dismiss via Escape or
              the close button. */}
          <Action
            variant="unstyled"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 cursor-default"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={photo.caption || `Photo of ${photo.plant?.nickname ?? 'a plant'}`}
            className="relative flex flex-col items-center gap-3 max-w-[92vw] max-h-[92vh]"
          >
            <div className="absolute -top-1 right-0 -translate-y-full flex items-center gap-2">
              {onDelete && (
                <Action
                  variant="unstyled"
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => onDelete(photo)}
                  className={`${CONTROL} w-9 h-9 hover:bg-coral/80`}
                >
                  <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4" />
                </Action>
              )}
              <Action
                ref={closeRef}
                variant="unstyled"
                type="button"
                aria-label="Close photo"
                onClick={onClose}
                className={`${CONTROL} w-9 h-9`}
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </Action>
            </div>

            {hasPrev && (
              <Action
                variant="unstyled"
                type="button"
                aria-label="Previous photo"
                onClick={onPrev}
                className={`${CONTROL} absolute top-1/2 -translate-y-1/2 left-2 sm:left-0 sm:-translate-x-[120%] w-10 h-10`}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
              </Action>
            )}
            {hasNext && (
              <Action
                variant="unstyled"
                type="button"
                aria-label="Next photo"
                onClick={onNext}
                className={`${CONTROL} absolute top-1/2 -translate-y-1/2 right-2 sm:right-0 sm:translate-x-[120%] w-10 h-10`}
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
              </Action>
            )}

            <motion.img
              key={photo.id}
              src={photo.image_url}
              alt={photo.caption || `Photo of ${photo.plant?.nickname ?? 'a plant'}`}
              draggable={false}
              drag={canSwipe ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={handleDragEnd}
              className={`max-w-full max-h-[80vh] object-contain rounded-md shadow-warm-lg select-none ${
                canSwipe ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              {...imageMotion}
            />

            <div className="text-center text-ink">
              {photo.caption && <p className="text-sm font-medium">{photo.caption}</p>}
              <p className="text-xs text-ink">
                {photo.plant?.nickname ? `${photo.plant.nickname} · ` : ''}
                {formatLongDate(photo.taken_at)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
