import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

// The animated step swap shared by the modal wizards (WizardDialog → AddSpace,
// and AddPlantDialog). Crossfades `children` on `currentKey` change and
// animates the container height to the new content's measured height:
//   - synchronous callback-ref measure on mount (so a taller step never
//     flashes clipped then grows),
//   - a ResizeObserver for in-step changes (e.g. a validation error appearing),
//   - a per-key height cache so a return visit (Back) resizes during the
//     outgoing fade rather than growing under the incoming content.
// Height, not framer `layout` (which scales/squishes the fading content).
// Reduced-motion → instant. Onboarding has its own (fixed-height) transition.
//
// `animateHeight={false}` → crossfade only, no height animation: for steps
// that own their own height/scroll (e.g. a search-results list that must stay
// bounded + scroll, like AddPlant's species step). Each step fills the dialog
// (flex-1), so the swap is a clean fade with no resize.
export default function WizardTransition({ currentKey, children, animateHeight = true }) {
  const observerRef = useRef(null)
  const heightsRef = useRef({})
  const currentKeyRef = useRef(currentKey)
  currentKeyRef.current = currentKey
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }
  const [height, setHeight] = useState(null)

  // Start animating toward the new key's cached height right away (during the
  // outgoing fade); the callback ref confirms the exact height on mount.
  useEffect(() => {
    if (!animateHeight) return
    const cached = heightsRef.current[currentKey]
    if (cached != null) setHeight(cached)
  }, [currentKey, animateHeight])

  const measure = useCallback((node) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node) return
    const apply = (value) => {
      heightsRef.current[currentKeyRef.current] = value
      setHeight(value)
    }
    apply(node.offsetHeight)
    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver(([entry]) => apply(entry.contentRect.height))
      observerRef.current.observe(node)
    }
  }, [])

  if (!animateHeight) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="flex-1 flex flex-col min-h-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <motion.div animate={{ height: height ?? 'auto' }} transition={transition} className="overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentKey}
          ref={measure}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="flex flex-col gap-4"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
