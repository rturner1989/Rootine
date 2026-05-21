import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { usePhotoPicker } from '../../hooks/usePhotoPicker'
import { useLogCare } from '../../hooks/usePlants'
import RadialWheel from '../ui/RadialWheel'

// Six-spoke layout matches the RadialWheel SIX_SPOKE_SWEEPS preset
// (12/6 + 2/4/8/10). The two `disabled` slots are placeholders for
// upcoming actions — surface their intent visually so users see what's
// coming, rather than hiding behind a 4-spoke layout that'd need
// rebalancing when we add them. Exported for any plant-action surface
// that wants the same six spokes (PlantQuickDialog, etc.).
export const PLANT_ACTION_SPOKES = [
  { id: 'water', icon: '💧', label: 'Water' },
  { id: 'feed', icon: '🌱', label: 'Feed' },
  { id: 'photo', icon: '📷', label: 'Photo' },
  { id: 'doctor', icon: '🩺', label: 'Doctor' },
  { id: 'note', icon: '📝', label: 'Note', disabled: true, disabledReason: 'Coming soon' },
  { id: 'move', icon: '🪴', label: 'Move', disabled: true, disabledReason: 'Coming soon' },
]

// Plant-scoped wheel rendered as a fixed-position portal overlay so
// the trigger element's layout stays untouched. `anchor` is a DOM
// node (typically the element that opened the wheel); the wheel
// centres on the anchor's bounding rect. Page scroll closes the wheel
// rather than tracking — anchored elements moving under it would feel
// unstable.
export default function ActionWheel({
  plant,
  open,
  onOpenChange,
  anchor,
  centered = false,
  size = 'md',
  primaryAction,
  centreSlot,
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const logCare = useLogCare(plant?.id)
  const { openPicker } = usePhotoPicker(plant?.id)
  // Mobile: viewport-centred dialog (mockup 18). Desktop: anchored to
  // clicked element. Breakpoint matches Tailwind `md` so the wheel
  // switches at the same point the layout shifts to two-column.
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [position, setPosition] = useState(null)
  // Persists across portal mount cycles — RadialWheel re-mounts every
  // time the wheel opens, so its internal first-open detection resets
  // and the orbit choreography would replay forever. We track here.
  const firstOpenSeenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    if (centered || isMobile) {
      // Centre on the viewport — dialog-style. No anchor tracking, no
      // close-on-scroll (a centred dialog stays put). `centered` is the
      // explicit opt-in (e.g. ritual rows where anchoring to a row feels
      // off-balance); mobile gets it implicitly.
      setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      return
    }
    if (!anchor) {
      setPosition(null)
      return
    }
    const rect = anchor.getBoundingClientRect()
    setPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })

    function close() {
      onOpenChange?.(false)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, anchor, onOpenChange, isMobile, centered])

  // Mark orbit as seen after first successful open. Subsequent opens
  // skip orbit and use quick-reveal stagger.
  useEffect(() => {
    if (open) firstOpenSeenRef.current = true
  }, [open])

  // Stable derived spoke list — only the `primary` flag varies with
  // primaryAction, so memoising prevents RadialWheel from re-running
  // its layout calculations on every parent render.
  const spokes = useMemo(
    () => PLANT_ACTION_SPOKES.map((spoke) => ({ ...spoke, primary: spoke.id === primaryAction })),
    [primaryAction],
  )

  function handleSpoke(spokeId) {
    onOpenChange?.(false)
    if (!plant) return

    if (spokeId === 'water') {
      logCare.mutate({ care_type: 'watering' })
      toast.success(`Watered ${plant.nickname} 💧`)
      return
    }
    if (spokeId === 'feed') {
      logCare.mutate({ care_type: 'feeding' })
      toast.success(`Fed ${plant.nickname} 🌱`)
      return
    }
    if (spokeId === 'photo') {
      openPicker()
      return
    }
    if (spokeId === 'doctor') {
      navigate(`/plants/${plant.id}`)
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && position ? (
        <motion.div key="wheel-overlay" className="fixed inset-0 z-[60]">
          <motion.button
            type="button"
            aria-label="Close action wheel"
            className="absolute inset-0 bg-ink/30 backdrop-blur-light cursor-default focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald/40 focus-visible:ring-inset"
            onClick={() => onOpenChange?.(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <div
            className="absolute pointer-events-none"
            style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
              className="pointer-events-auto"
            >
              <RadialWheel
                size={isMobile ? 'sm' : size}
                centreLabel={plant ? `Actions for ${plant.nickname}` : 'Actions'}
                centreSlot={centreSlot}
                spokes={spokes}
                onSpoke={handleSpoke}
                open
                onOpenChange={onOpenChange}
                firstOpenSeen={firstOpenSeenRef.current}
              />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
