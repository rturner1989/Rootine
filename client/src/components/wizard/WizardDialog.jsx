import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import StepProgress from './StepProgress'
import WizardActions from './WizardActions'

// Generic multi-step modal wizard — the modal counterpart to onboarding's
// full-page WizardCard. Owns linear step nav, the Back/Continue footer, an
// optional progress strip, and an optional post-complete screen.
//
// Steps are declarative. Each renders its own body via a `content`
// render-prop that receives `{ goNext, goBack }`, so a selection-driven
// step (e.g. pick a species → advance) can advance itself with no Continue
// button (`hideContinue`). Form steps rely on the Continue button instead.
//
// `onComplete` runs on the final step's Continue: return the result to
// succeed (→ `completion` screen if provided, else close), or return
// null/undefined to abort and stay (the consumer surfaces its own error).
//
// State resets via remount — re-key the dialog on open (no open-sync
// effect), matching the project's key-driven idiom.
export default function WizardDialog({
  open,
  onClose,
  title,
  steps,
  onComplete,
  completion = null,
  completionActions = null,
  showProgress = true,
}) {
  const titleId = useId()
  const bodyRef = useRef(null)
  const observerRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }
  const [stepIndex, setStepIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [bodyHeight, setBodyHeight] = useState(null)
  const heightsRef = useRef({})

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const isComplete = result != null && completion != null
  const currentKey = isComplete ? 'complete' : stepIndex
  const currentKeyRef = useRef(currentKey)
  currentKeyRef.current = currentKey

  // Move focus into the active surface on advance/back, and onto the
  // completion screen when it replaces the form, so keyboard + SR users
  // land inside it. Skip the initial render — Dialog focuses the card on open.
  useEffect(() => {
    if (stepIndex > 0 || isComplete) bodyRef.current?.focus()
  }, [stepIndex, isComplete])

  // Animate the body height between steps instead of snapping. Measure each
  // step the instant it mounts (callback ref → synchronous, before paint, so
  // a taller step never flashes clipped then grows) then keep observing it
  // for in-step changes, e.g. a validation error appearing. Height — not
  // framer `layout`, which scales and visibly squishes the fading content.
  const measureStep = useCallback((node) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node) return
    const apply = (height) => {
      heightsRef.current[currentKeyRef.current] = height
      setBodyHeight(height)
    }
    apply(node.offsetHeight)
    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver(([entry]) => apply(entry.contentRect.height))
      observerRef.current.observe(node)
    }
  }, [])

  // On step/completion change, start animating toward the new surface's
  // height right away using its cached height from an earlier visit — so the
  // box is the right size before the incoming content fades in, rather than
  // growing under it. measureStep confirms the exact height once it mounts
  // (and records first visits).
  useEffect(() => {
    const cached = heightsRef.current[currentKey]
    if (cached != null) setBodyHeight(cached)
  }, [currentKey])

  function goNext() {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isComplete || step.canContinue === false || submitting) return

    if (!isLast) {
      goNext()
      return
    }

    setSubmitting(true)
    try {
      const completedResult = await onComplete()
      if (completedResult == null) return

      if (completion) setResult(completedResult)
      else onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} ariaLabelledBy={titleId}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Header divider={false} className="flex flex-col gap-3">
          <p id={titleId} className="text-lg font-extrabold text-ink">
            {isComplete ? title : (step.title ?? title)}
          </p>
          {showProgress && !isComplete && <StepProgress step={stepIndex + 1} total={steps.length} />}
        </Card.Header>

        <Card.Body ref={bodyRef} tabIndex={-1} className="flex flex-col focus:outline-none">
          {/* Animate the body to the measured content height (not framer
              `layout`, which scales — and visibly squishes — the fading
              content) with a plain opacity crossfade for the swap. */}
          <motion.div animate={{ height: bodyHeight ?? 'auto' }} transition={transition} className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentKey}
                ref={measureStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="flex flex-col gap-4"
              >
                {isComplete ? completion(result) : step.content({ goNext, goBack })}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </Card.Body>

        {isComplete ? (
          completionActions && (
            <Card.Footer divider={false} className="pt-2 flex gap-2.5">
              {completionActions(result)}
            </Card.Footer>
          )
        ) : (
          <WizardActions
            onBack={stepIndex > 0 && !step.hideBack ? goBack : undefined}
            continueLabel={step.continueLabel ?? (isLast ? 'Finish' : 'Continue →')}
            continueDisabled={step.canContinue === false}
            hideContinue={step.hideContinue}
            submitting={submitting}
          />
        )}
      </form>
    </Dialog>
  )
}
