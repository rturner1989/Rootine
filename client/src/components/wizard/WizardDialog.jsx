import { useEffect, useId, useRef, useState } from 'react'
import { useWizardSteps } from '../../hooks/useWizardSteps'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import StepProgress from './StepProgress'
import WizardActions from './WizardActions'
import WizardTransition from './WizardTransition'

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
  const { stepIndex, goNext, goBack, isLast } = useWizardSteps(steps.length)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const step = steps[stepIndex]
  const isComplete = result != null && completion != null
  const currentKey = isComplete ? 'complete' : stepIndex

  // Move focus into the active surface on advance/back + onto the completion
  // screen, so keyboard + SR users land in it. Skip the initial render (Dialog
  // focuses the card) and step 0 (its own autoFocus'd field wins).
  useEffect(() => {
    if (stepIndex > 0 || isComplete) bodyRef.current?.focus()
  }, [stepIndex, isComplete])

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
            {isComplete ? completion(result) : step.content({ goNext, goBack })}
          </WizardTransition>
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
