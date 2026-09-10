import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { AnimatePresence, motion, type Transition, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useSearch } from '../../hooks/useSearch'
import ActionIcon from '../ui/ActionIcon'
import SearchInput from './SearchInput'

type BarMotionPreset = {
  initial: { y: number; opacity: number }
  animate: { y: number; opacity: number }
  exit: { y: number; opacity: number }
  transition: Transition
}

const barMotion: BarMotionPreset = {
  initial: { y: -120, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -120, opacity: 0 },
  transition: { duration: 0.24, ease: [0.33, 1, 0.68, 1] },
}

type BackdropMotionPreset = {
  initial: { opacity: number }
  animate: { opacity: number }
  exit: { opacity: number }
  transition: Transition
}

const backdropMotion: BackdropMotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function MobileSearchDrawer() {
  const search = useSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<Element | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const open = search.isMobileDrawerOpen && search.isActive

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement
    inputRef.current?.focus()

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        search.closeMobileDrawer()
        return
      }
      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      const target = previouslyFocusedRef.current
      // Skip restoring to text inputs to avoid re-opening the iOS
      // keyboard mid-close (same trick as Dialog primitive).
      if (
        target instanceof HTMLElement &&
        typeof target.focus === 'function' &&
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        target.focus()
      }
    }
  }, [open, search.closeMobileDrawer])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close search"
            onClick={search.closeMobileDrawer}
            className="md:hidden fixed inset-0 z-40 bg-ink/30 backdrop-blur-md border-0 cursor-pointer"
            {...(shouldReduceMotion ? {} : backdropMotion)}
          />
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="md:hidden fixed top-0 left-0 right-0 max-h-[85dvh] z-50 pt-[max(0.75rem,env(safe-area-inset-top))] bg-paper shadow-warm-md flex flex-col"
            {...(shouldReduceMotion ? {} : barMotion)}
          >
            <div className="flex items-center gap-2 px-3 pb-3 border-b border-paper-edge">
              <SearchInput
                value={search.query}
                onChange={search.setQuery}
                onClear={search.clearAll}
                hasFilterToClear={search.hasFilterToClear}
                placeholder={search.placeholder}
                inputRef={inputRef}
                className="flex-1"
              />
              <ActionIcon
                icon={faXmark}
                label="Close search"
                onClick={search.closeMobileDrawer}
                size="md"
                scheme="ghost"
                className="shrink-0"
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {search.renderResults ? (
                search.renderResults({ query: search.query })
              ) : (
                <p className="px-4 py-8 text-center text-sm text-ink-soft">No results yet — start typing.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
