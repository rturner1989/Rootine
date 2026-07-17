import { INTENT_KEYS, INTENTS } from '../../utils/intents'
import Card from '../ui/Card'
import Heading from '../ui/Heading'

// A record, not a picker. Nothing outside the wizard reads
// onboarding_intent yet, so a working control here would change nothing
// — hence no hover or pointer cue on the chips.
export default function IntentCard({ profile }) {
  const chosen = profile?.onboarding_intent

  return (
    <Card variant="paper-warm" className="px-6 py-5 gap-1">
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <Heading as="h2" variant="panel">
          <em className="text-emerald">Intent</em>
        </Heading>
        <span className="eyebrow-label ml-auto text-ink-soft">From onboarding</span>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed mb-3">
        {INTENTS[chosen]
          ? 'What brought you here, picked when you signed up.'
          : "You didn't pick one when you signed up — no bother, nothing depends on it yet."}
      </p>

      <ul className="grid grid-cols-2 gap-2">
        {INTENT_KEYS.map((key) => {
          const isChosen = key === chosen
          return (
            <li
              key={key}
              // aria-current marks the choice without implying a control;
              // the visual highlight alone wouldn't reach a screen reader.
              aria-current={isChosen ? 'true' : undefined}
              className={`flex flex-col items-center text-center gap-1 px-1.5 py-2.5 rounded-md border ${
                isChosen
                  ? 'bg-mint border-emerald shadow-[0_3px_10px_rgba(20,144,47,0.18)]'
                  : 'bg-paper-deep border-transparent'
              }`}
            >
              <span className="text-[22px] leading-none" aria-hidden="true">
                {INTENTS[key].emoji}
              </span>
              <span
                className={`font-display italic text-xs leading-tight break-words ${
                  isChosen ? 'font-medium text-forest' : 'text-ink'
                }`}
              >
                {INTENTS[key].label}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
