import { AnimatePresence, motion } from 'motion/react'
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef } from 'react'
import { useUnseenAchievements } from '../hooks/useUnseenAchievements'
import Action from './ui/Action'
import Heading from './ui/Heading'

// Placeholder splash for splash-surface achievements (login_streak_*).
// Renders the front of the unseen queue as a full-screen overlay; the
// "Continue" action marks it seen and the next entry (if any) takes
// its place. Visual is intentionally minimal — placeholder pending a
// proper trophy-room design pass.
//
// Focus management: Continue receives initial focus when a splash
// becomes visible. While open, Tab + Shift-Tab loop within the dialog
// (only Continue is focusable, so the trap collapses to a no-op
// guard against escape into the page below). On unmount focus is
// returned to <main>.
export default function AchievementSplash() {
  const { achievements, markSeen } = useUnseenAchievements()
  const next = achievements[0]
  const continueRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!next) return
    continueRef.current?.focus()

    function trap(event: KeyboardEvent | ReactKeyboardEvent) {
      if (event.key !== 'Tab') return
      if (document.activeElement === continueRef.current) {
        event.preventDefault()
        continueRef.current?.focus()
      }
    }

    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      const main = document.getElementById('main-content')
      main?.focus()
    }
  }, [next])

  return (
    <AnimatePresence>
      {next ? (
        <motion.div
          key={next.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-splash-title"
        >
          <motion.div
            initial={{ scale: 0.85, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="bg-paper border border-paper-edge/50 rounded-md shadow-xl max-w-sm w-full p-8 flex flex-col items-center gap-4 text-center"
          >
            <div aria-hidden="true" className="text-7xl">
              {next.emoji}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-sunshine-deep">Achievement unlocked</p>
            <Heading as="h2" id="achievement-splash-title" variant="panel" className="text-ink">
              {next.label}
            </Heading>
            <Action ref={continueRef} variant="unstyled" onClick={() => markSeen(next.id)} className="mt-2 w-full">
              Continue
            </Action>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
