import { AnimatePresence, type MotionValue, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Action from './Action'

const SIZES = {
  sm: { wheel: 240, centre: 76, spoke: 56, spokeIcon: 18 },
  md: { wheel: 320, centre: 100, spoke: 72, spokeIcon: 24 },
  lg: { wheel: 440, centre: 150, spoke: 100, spokeIcon: 32 },
} as const

export type RadialWheelSize = keyof typeof SIZES

type WheelDimensions = (typeof SIZES)[RadialWheelSize]

function orbitRadius(dimensions: WheelDimensions): number {
  return (dimensions.wheel - dimensions.spoke) / 2 - 8
}

const SIX_SPOKE_SWEEPS = [0, 180, 60, 120, 240, 300]

function spokeSweep(index: number, count: number): number {
  if (count === 6) return SIX_SPOKE_SWEEPS[index]
  return (360 / count) * index
}

function finalAngle(index: number, count: number): number {
  return -90 + spokeSweep(index, count)
}

function orbitPosition(index: number, count: number): number {
  const thisSweep = spokeSweep(index, count)
  let position = 0
  for (let i = 0; i < count; i++) {
    if (i === index) continue
    const otherSweep = spokeSweep(i, count)
    if (otherSweep > thisSweep || (otherSweep === thisSweep && i < index)) {
      position++
    }
  }
  return position
}

const PULSE_ANIMATE = {
  boxShadow: [
    '0 0 0 0 rgba(255,107,61,0.4), 0 4px 14px rgba(20,144,47,0.18)',
    '0 0 0 12px rgba(255,107,61,0)',
    '0 0 0 0 rgba(255,107,61,0)',
  ],
}
const PULSE_TRANSITION = { duration: 2.2, ease: 'easeInOut' as const, repeat: Infinity }

const ARROW_DELTA: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

const ORBIT_DURATION = 0.5
const ORBIT_STAGGER = 0.15
const QUICK_REVEAL_DURATION = 0.22
const QUICK_REVEAL_STAGGER = 0.03

// Mac-dock magnification — peak boost at the cursor position, falling
// off smoothly to no growth past `falloffPx` from the spoke centre.
const MAGNIFY_PEAK = 0.35
function magnifyFalloff(dimensions: WheelDimensions): number {
  return dimensions.spoke * 1.6
}

// Flip the "seen" flag on the FIRST `open=true` and never look back.
// Don't wait for the orbital animation to finish — the wrapper's
// `initial` prop is captured at mount, so the first-open spokes start
// at -90 regardless of when the flag flips. Tying the flip to a
// timeout-with-cleanup would mean closing the wheel mid-orbit cancels
// the flip, leaving the wheel stuck in orbit-mode forever.
function useFirstOpen(open: boolean): boolean {
  const seenRef = useRef(false)
  const [, forceRerender] = useState(0)

  useEffect(() => {
    if (open && !seenRef.current) {
      seenRef.current = true
      forceRerender((n) => n + 1)
    }
  }, [open])

  return !seenRef.current
}

export type RadialWheelSpoke = {
  id: string
  icon: ReactNode
  label: string
  disabled?: boolean
  disabledReason?: string
  primary?: boolean
}

type SpokeProps = {
  spoke: RadialWheelSpoke
  target: number
  dimensions: WheelDimensions
  radius: number
  isDisabled: boolean
  showPulse: boolean
  orbitMode: boolean
  duration: number
  delay: number
  shouldReduceMotion: boolean | null
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
  isTapped: boolean
  position: number
  total: number
  onClick: () => void
  onFocus: () => void
  spokeRef: (node: HTMLButtonElement | null) => void
}

function Spoke({
  spoke,
  target,
  dimensions,
  radius,
  isDisabled,
  showPulse,
  orbitMode,
  duration,
  delay,
  shouldReduceMotion,
  mouseX,
  mouseY,
  isTapped,
  position,
  total,
  onClick,
  onFocus,
  spokeRef,
}: SpokeProps) {
  // Spoke's own centre point in container-relative coords (origin at
  // wheel centre). Used to compute mouse-distance for magnification.
  const angleRad = (target * Math.PI) / 180
  const spokeX = Math.cos(angleRad) * radius
  const spokeY = Math.sin(angleRad) * radius

  const falloff = magnifyFalloff(dimensions)
  const scale = useTransform([mouseX, mouseY], ([mx, my]: number[]) => {
    if (isDisabled || shouldReduceMotion) return 1
    if (!Number.isFinite(mx) || !Number.isFinite(my)) return 1
    const dist = Math.hypot(mx - spokeX, my - spokeY)
    if (dist >= falloff) return 1
    const ratio = 1 - dist / falloff
    return 1 + MAGNIFY_PEAK * ratio * ratio
  })

  return (
    <div
      className="absolute"
      style={{
        left: radius,
        top: 0,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <motion.button
        ref={spokeRef}
        type="button"
        role="menuitem"
        aria-label={`${spoke.label}${spoke.disabledReason ? ` (${spoke.disabledReason})` : ''}, ${position} of ${total}`}
        aria-disabled={isDisabled || undefined}
        disabled={isDisabled}
        onClick={onClick}
        onFocus={onFocus}
        initial={{ rotate: orbitMode ? 90 : -target }}
        animate={showPulse ? { rotate: -target, ...PULSE_ANIMATE } : { rotate: -target }}
        whileTap={isDisabled ? undefined : { scale: 0.92 }}
        transition={
          showPulse
            ? {
                ...PULSE_TRANSITION,
                rotate: {
                  duration: shouldReduceMotion ? 0 : duration,
                  delay: shouldReduceMotion ? 0 : delay,
                  ease: 'easeOut' as const,
                },
              }
            : {
                duration: shouldReduceMotion ? 0 : duration,
                delay: shouldReduceMotion ? 0 : delay,
                ease: 'easeOut' as const,
              }
        }
        className={`pointer-events-auto rounded-full flex flex-col items-center justify-center gap-0.5 transition-shadow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald/40 ${
          isDisabled
            ? 'bg-paper-deep text-ink-softer border border-paper-edge/50 opacity-50 cursor-not-allowed'
            : isTapped
              ? 'bg-mint text-emerald-deep border-2 border-leaf shadow-warm-md scale-110'
              : 'bg-paper text-ink shadow-warm-sm border border-paper-edge/50 cursor-pointer hover:bg-mint hover:border-emerald/30 hover:shadow-warm-md'
        }`}
        style={{
          width: dimensions.spoke,
          height: dimensions.spoke,
          scale,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: dimensions.spokeIcon }}>
          {spoke.icon}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.06em]">{spoke.label}</span>
      </motion.button>
    </div>
  )
}

export type RadialWheelProps = {
  size?: RadialWheelSize
  centreLabel?: string
  centreSlot?: ReactNode
  spokes?: RadialWheelSpoke[]
  onSpoke?: (spokeId: string) => void
  urgent?: boolean
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // When true, skip the first-open orbit choreography and use the
  // quick-reveal variant immediately. Lets consumers persist
  // "already-seen-the-orbit" state across portal mount cycles.
  firstOpenSeen?: boolean
  // Dashed emerald guide ring at the spoke orbit radius — Mockup 22's
  // wheel-hero decoration. Pure visual, no interaction.
  showOrbit?: boolean
  className?: string
}

type OpenUpdater = boolean | ((current: boolean) => boolean)

export default function RadialWheel({
  size = 'md',
  centreLabel = 'Actions',
  centreSlot,
  spokes = [],
  onSpoke,
  urgent = false,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  firstOpenSeen = false,
  showOrbit = false,
  className = '',
}: RadialWheelProps) {
  const dimensions = SIZES[size] ?? SIZES.md
  const radius = orbitRadius(dimensions)
  const shouldReduceMotion = useReducedMotion()
  const isControlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = isControlled ? openProp : internalOpen
  // Functional updater path reads from setInternalOpen's closure, so
  // we don't need internalOpen in the dependency list — that would
  // recreate setOpen every render and thrash any consumer memoising
  // on its identity.
  const setOpen = useCallback(
    (next: OpenUpdater) => {
      if (isControlled) {
        const value = typeof next === 'function' ? next(openProp) : next
        onOpenChange?.(value)
        return
      }
      setInternalOpen((current) => {
        const value = typeof next === 'function' ? next(current) : next
        onOpenChange?.(value)
        return value
      })
    },
    [isControlled, onOpenChange, openProp],
  )
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [tappedSpokeId, setTappedSpokeId] = useState<string | null>(null)
  const internalFirstOpen = useFirstOpen(open)
  const isFirstOpen = !firstOpenSeen && internalFirstOpen
  const containerRef = useRef<HTMLDivElement>(null)
  const centreButtonRef = useRef<HTMLButtonElement>(null)
  const spokeRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Mouse position relative to the wheel centre. NaN signals "not over
  // the wheel" — spokes treat that as no magnification.
  const mouseX = useMotionValue(Number.NaN)
  const mouseY = useMotionValue(Number.NaN)

  useEffect(() => {
    if (open) setFocusedIndex(0)
    else setFocusedIndex(-1)
  }, [open])

  useEffect(() => {
    if (!open || focusedIndex < 0) return
    spokeRefs.current[focusedIndex]?.focus()
  }, [open, focusedIndex])

  useEffect(() => {
    if (!open) return
    const node = containerRef.current
    if (!node) return
    // Re-bound so the nested function declarations below close over a
    // definitely-non-null reference — TS doesn't carry the `if (!node)
    // return` narrowing into function-declaration closures.
    const container = node

    function handlePointerMove(event: PointerEvent) {
      const rect = container.getBoundingClientRect()
      mouseX.set(event.clientX - rect.left - rect.width / 2)
      mouseY.set(event.clientY - rect.top - rect.height / 2)
    }
    function handlePointerLeave() {
      mouseX.set(Number.NaN)
      mouseY.set(Number.NaN)
    }
    node.addEventListener('pointermove', handlePointerMove)
    node.addEventListener('pointerleave', handlePointerLeave)
    return () => {
      node.removeEventListener('pointermove', handlePointerMove)
      node.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [open, mouseX, mouseY])

  useEffect(() => {
    if (!open) return
    function handlePointer(event: PointerEvent) {
      if (!(event.target instanceof Node) || !containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        centreButtonRef.current?.focus()
        return
      }
      const delta = ARROW_DELTA[event.key]
      if (delta === undefined) return
      event.preventDefault()
      setFocusedIndex((current) => (current + delta + spokes.length) % spokes.length)
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, spokes.length, setOpen])

  function handleCentreClick() {
    setOpen((current) => !current)
  }

  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSpokeClick(spoke: RadialWheelSpoke) {
    if (spoke.disabled) return
    // Reduced-motion users skip the 220ms confirm pulse — pulse delay
    // serves no purpose when the visual cue is suppressed and the
    // delay itself is the kind of latency that defeats reduced-motion.
    if (shouldReduceMotion) {
      onSpoke?.(spoke.id)
      setOpen(false)
      return
    }
    // Fire the action immediately so dialog opens / navigation starts
    // without waiting on the pulse. Pulse + wheel close run in parallel
    // for visual feedback. Timeout stored so unmount / re-click can
    // cancel it cleanly.
    onSpoke?.(spoke.id)
    setTappedSpokeId(spoke.id)
    tapTimeoutRef.current = setTimeout(() => {
      setOpen(false)
      setTappedSpokeId(null)
      tapTimeoutRef.current = null
    }, 220)
  }

  // Cancel any pending confirm pulse on unmount so the timeout can't
  // fire callbacks against a torn-down component.
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: dimensions.wheel, height: dimensions.wheel }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/85 backdrop-blur-light"
            style={{ width: dimensions.wheel, height: dimensions.wheel }}
          />
        )}
      </AnimatePresence>

      {showOrbit && open ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald/40 pointer-events-none"
          style={{ width: radius * 2, height: radius * 2 }}
        />
      ) : null}

      <Action
        ref={centreButtonRef}
        variant="unstyled"
        onClick={handleCentreClick}
        aria-label={centreLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden flex items-center justify-center bg-paper-deep shadow-warm-sm transition-transform active:scale-95 z-10"
        style={{ width: dimensions.centre, height: dimensions.centre }}
      >
        {centreSlot}
      </Action>

      <AnimatePresence>
        {open && (
          <motion.div
            key="spokes"
            role="menu"
            aria-label={centreLabel}
            className="absolute inset-0 pointer-events-none"
          >
            {spokes.map((spoke, index) => {
              const target = finalAngle(index, spokes.length)
              const isPrimary = Boolean(spoke.primary)
              const isDisabled = Boolean(spoke.disabled)
              const showPulse = isPrimary && urgent && !shouldReduceMotion && !isDisabled

              const orbitMode = isFirstOpen && !shouldReduceMotion
              const stagger = orbitMode ? ORBIT_STAGGER : QUICK_REVEAL_STAGGER
              const duration = orbitMode ? ORBIT_DURATION : QUICK_REVEAL_DURATION
              const queuePosition = orbitMode ? orbitPosition(index, spokes.length) : index
              const delay = queuePosition * stagger

              const wrapperInitial = orbitMode
                ? { rotate: -90, opacity: 0 }
                : { rotate: target, opacity: 0, scale: 0.5 }
              const wrapperAnimate = orbitMode
                ? { rotate: target, opacity: 1 }
                : { rotate: target, opacity: 1, scale: 1 }
              const wrapperExit = { rotate: target, opacity: 0, scale: 0.5 }

              return (
                <motion.div
                  key={spoke.id}
                  className="absolute top-1/2 left-1/2 pointer-events-none"
                  style={{ width: 0, height: 0 }}
                  initial={wrapperInitial}
                  animate={wrapperAnimate}
                  exit={wrapperExit}
                  transition={{
                    duration: shouldReduceMotion ? 0 : duration,
                    delay: shouldReduceMotion ? 0 : delay,
                    ease: 'easeOut',
                  }}
                >
                  <Spoke
                    spoke={spoke}
                    target={target}
                    dimensions={dimensions}
                    radius={radius}
                    isDisabled={isDisabled}
                    showPulse={showPulse}
                    orbitMode={orbitMode}
                    duration={duration}
                    delay={delay}
                    shouldReduceMotion={shouldReduceMotion}
                    mouseX={mouseX}
                    mouseY={mouseY}
                    isTapped={tappedSpokeId === spoke.id}
                    position={index + 1}
                    total={spokes.length}
                    onClick={() => handleSpokeClick(spoke)}
                    onFocus={() => setFocusedIndex(index)}
                    spokeRef={(node) => {
                      spokeRefs.current[index] = node
                    }}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
