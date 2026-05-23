import { useId, useState } from 'react'
import Card from '../ui/Card'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'
import StepTip from '../wizard/StepTip'
import WizardActions from '../wizard/WizardActions'
import { INTENT_CONFIG, INTENT_KEYS } from './intentConfig'

export default function Step1Intent({ initialIntent = null, onBack, onContinue, submitting = false }) {
  const groupName = useId()
  const [selectedIntent, setSelectedIntent] = useState(initialIntent)
  const previewConfig = selectedIntent ? INTENT_CONFIG[selectedIntent] : null

  function handleSubmit(event) {
    event.preventDefault()
    if (!selectedIntent) return

    onContinue(selectedIntent)
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
      <Card.Header divider={false}>
        <Heading
          variant="display"
          className="text-ink"
          subtitle="Pick the one that sounds most like you today — we'll shape the rest to match. Change your mind whenever."
        >
          What brings you <Emphasis>here?</Emphasis>
        </Heading>
        {previewConfig && (
          <div aria-live="polite" className="mt-4">
            <StepTip icon={previewConfig.previewIcon}>{previewConfig.previewLine}</StepTip>
          </div>
        )}
      </Card.Header>

      <Card.Body>
        <div className="grid grid-cols-2 auto-rows-fr gap-3 h-full" role="radiogroup" aria-label="Onboarding intent">
          {INTENT_KEYS.map((intent) => {
            const config = INTENT_CONFIG[intent]
            const isSelected = selectedIntent === intent
            return (
              <label
                key={intent}
                className={`relative flex flex-col items-center sm:items-start text-center sm:text-left gap-2 p-4 rounded-md border-[1.5px] cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-mint border-leaf'
                    : 'bg-paper-deep border-paper-edge hover:bg-mint/40 hover:border-leaf'
                }`}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={intent}
                  checked={isSelected}
                  onChange={() => setSelectedIntent(intent)}
                  className="sr-only"
                />
                <span className="hidden sm:inline text-3xl leading-none" aria-hidden="true">
                  {config.emoji}
                </span>
                <Heading as="h3" variant="compact">
                  {config.label}
                </Heading>
                <p className="text-xs text-ink-soft leading-snug">{config.description}</p>
              </label>
            )
          })}
        </div>
      </Card.Body>

      <WizardActions onBack={onBack} continueDisabled={!selectedIntent} submitting={submitting} />
    </form>
  )
}
