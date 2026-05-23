import Action from '../ui/Action'
import Card from '../ui/Card'

export default function WizardActions({
  onBack,
  backLabel = '← Back',
  continueLabel = 'Continue →',
  continueDisabled = false,
  hideContinue = false,
  submitting = false,
  submittingLabel = 'Saving…',
  children,
}) {
  return (
    <Card.Footer divider={false} className={`pt-2 ${children ? 'flex flex-col gap-3' : ''}`}>
      <div className="flex gap-2.5">
        {onBack && (
          <Action variant="secondary" onClick={onBack} disabled={submitting}>
            {backLabel}
          </Action>
        )}

        {!hideContinue && (
          <Action type="submit" variant="primary" disabled={continueDisabled || submitting} className="ml-auto">
            {submitting ? submittingLabel : continueLabel}
          </Action>
        )}
      </div>

      {children}
    </Card.Footer>
  )
}
