import { useCallback, useState } from 'react'

// Linear step navigation for the modal wizards. Pairs with WizardTransition
// (which animates the swap). State resets via remount, matching the project's
// key-driven idiom — except persistent context-driven dialogs, hence `reset`.
export function useWizardSteps(count) {
  const [stepIndex, setStepIndex] = useState(0)
  const goNext = useCallback(() => setStepIndex((current) => Math.min(current + 1, count - 1)), [count])
  const goBack = useCallback(() => setStepIndex((current) => Math.max(current - 1, 0)), [])
  const reset = useCallback(() => setStepIndex(0), [])
  return { stepIndex, goNext, goBack, reset, isLast: stepIndex === count - 1 }
}
