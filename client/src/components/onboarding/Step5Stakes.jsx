import Card from '../ui/Card'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'
import StepTip from '../wizard/StepTip'
import WizardActions from '../wizard/WizardActions'
import StakeRing from './stakes/StakeRing'

// Illustrative preview — Today reads live `dashboard.stats.streak_days`
// / `vitality_percent`. Don't wire useDashboard here.
const PREVIEW_STREAK_DAYS = 0
const PREVIEW_VITALITY_PERCENT = 50

export default function Step5Stakes({ onBack, onContinue }) {
  function handleSubmit(event) {
    event.preventDefault()
    onContinue()
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
      <Card.Header divider={false}>
        <Heading
          variant="display"
          className="text-ink"
          subtitle="Two little rings you'll see every time you open Today. Yours to fill."
        >
          This is <Emphasis>your streak</Emphasis>
        </Heading>
        <div className="mt-4">
          <StepTip icon="🌿">Not a ball and chain. Miss a day, nothing breaks — just pick it back up.</StepTip>
        </div>
      </Card.Header>

      <Card.Body className="flex flex-col gap-4">
        <div className="flex gap-3 sm:gap-4">
          <StakeRing
            scheme="streak"
            label="Streak"
            percent={0}
            valueDisplay={PREVIEW_STREAK_DAYS}
            unit="days"
            title="Day 0 · yours to start"
            description="Grows when you care for any plant on time. One grace day per week."
          />
          <StakeRing
            scheme="vitality"
            label="Vitality"
            percent={PREVIEW_VITALITY_PERCENT}
            valueDisplay={
              <>
                {PREVIEW_VITALITY_PERCENT}
                <span className="font-sans not-italic text-base text-ink-soft font-semibold">%</span>
              </>
            }
            title="Half-full, half-empty"
            description="Reflects how your greenhouse is doing overall. Consistent care lifts it."
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-mint/40 text-[13px] text-ink-soft text-left">
          <span
            aria-hidden="true"
            className="w-5 h-5 rounded-full bg-leaf text-paper text-[10px] flex items-center justify-center shrink-0"
          >
            ✓
          </span>
          <span>You'll see these every time you open Today — at the top of the page, always.</span>
        </div>
      </Card.Body>

      <WizardActions onBack={onBack} />
    </form>
  )
}
