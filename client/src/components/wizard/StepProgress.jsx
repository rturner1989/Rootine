const BAR_BASE = 'flex-1 h-[5px] rounded-full'
const BAR_PENDING = 'bg-emerald/20'
const BAR_DONE = 'bg-emerald'
const BAR_ACTIVE = 'bg-emerald shadow-[0_0_0_3px_rgba(20,144,47,0.2)]'

export default function StepProgress({ step, total, skipSteps = [] }) {
  // role="presentation" — WizardCard's "Step N of M" text below is the
  // accessible announcement; these bars are decorative.
  const skipSet = new Set(skipSteps)
  const visiblePositions = Array.from({ length: total }, (_, index) => index + 1).filter(
    (position) => !skipSet.has(position),
  )

  return (
    <div className="flex gap-1.5" role="presentation">
      {visiblePositions.map((position) => {
        let state = BAR_PENDING
        if (position < step) state = BAR_DONE
        else if (position === step) state = BAR_ACTIVE
        return <div key={position} className={`${BAR_BASE} ${state}`} />
      })}
    </div>
  )
}
