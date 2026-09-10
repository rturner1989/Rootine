import type { FormEvent, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { useWizardSteps } from '../../hooks/useWizardSteps'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import StepProgress from './StepProgress'
import WizardActions from './WizardActions'
import WizardTransition from './WizardTransition'

// Helpers a step's `content` renderer can use to drive its own navigation
// (a selection-driven step advancing itself with no Continue button).
// Inherited from useWizardSteps' own return shape rather than re-declared,
// so a change to goNext/goBack's signature there is felt here too.
type WizardStepHelpers = Pick<ReturnType<typeof useWizardSteps>, 'goNext' | 'goBack'>

export type WizardStep = {
  title?: string
  canContinue?: boolean
  continueLabel?: string
  hideContinue?: boolean
  hideBack?: boolean
  content: (helpers: WizardStepHelpers) => ReactNode
}

// Managed multi-step modal wizard — the modal counterpart to onboarding's
// full-page WizardCard. Owns the form, the Back/Continue footer, an optional
// progress strip, and an optional post-complete screen. The animated step
// swap lives in WizardTransition; linear nav in useWizardSteps.
//
// Steps are declarative. Each renders its body via `content({ goNext, goBack })`,
// so a selection-driven step can advance itself with no Continue button
// (`hideContinue`); form steps rely on the Continue button.
//
// `onComplete` runs on the final step's Continue: return the result to succeed
// (→ `completion` screen if provided, else close), or return null/undefined to
// abort and stay (the consumer surfaces its own error).
//
// State resets via remount — re-key the dialog on open (no open-sync effect).
//
// This is the *managed* wizard shell: it owns step index + navigation itself
// via `steps`/`onComplete`/`completion`. The self-managed crossfade pattern
// (AddPlantDialog, which drives its own useWizardSteps and renders
// WizardTransition directly with `animateHeight={false}`) is a different,
// deliberately separate composition — WizardDialogProps carries no
// crossfade-control prop (no `animateHeight`, no raw `currentKey`), so a
// caller can't mix step control (`steps`/`onComplete`) with crossfade control
// on the same prop bag.
export type WizardDialogProps<Result = unknown> = {
  open: boolean
  onClose: () => void
  title: string
  steps: WizardStep[]
  onComplete: () => Promise<Result | null | undefined>
  completion?: ((result: Result) => ReactNode) | null
  completionActions?: ((result: Result) => ReactNode) | null
  showProgress?: boolean
}

export default function WizardDialog<Result = unknown>({
  open,
  onClose,
  title,
  steps,
  onComplete,
  completion = null,
  completionActions = null,
  showProgress = true,
}: WizardDialogProps<Result>) {
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const { stepIndex, goNext, goBack, isLast } = useWizardSteps(steps.length)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const step = steps[stepIndex]
  const isComplete = result != null && completion != null
  const currentKey = isComplete ? 'complete' : stepIndex

  // Move focus into the active surface on advance/back + onto the completion
  // screen, so keyboard + SR users land in it. Skip the initial render (Dialog
  // focuses the card) and step 0 (its own autoFocus'd field wins).
  useEffect(() => {
    if (stepIndex > 0 || isComplete) bodyRef.current?.focus()
  }, [stepIndex, isComplete])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
          {showProgress && !isComplete && (
            <>
              <StepProgress step={stepIndex + 1} total={steps.length} />
              {/* The bars are decorative; give SR users the step count too. */}
              <span className="sr-only" aria-live="polite">
                Step {stepIndex + 1} of {steps.length}
              </span>
            </>
          )}
        </Card.Header>

        <Card.Body ref={bodyRef} tabIndex={-1} className="flex flex-col focus:outline-none">
          <WizardTransition currentKey={currentKey}>
            {/* Re-checks what isComplete already guarantees — TS can't carry
                that derived boolean's narrowing of result/completion here. */}
            {result != null && completion ? completion(result) : step.content({ goNext, goBack })}
          </WizardTransition>
        </Card.Body>

        {isComplete ? (
          result != null &&
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
