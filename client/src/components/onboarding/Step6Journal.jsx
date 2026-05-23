import { usePlants } from '../../hooks/usePlants'
import Card from '../ui/Card'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'
import StepTip from '../wizard/StepTip'
import WizardActions from '../wizard/WizardActions'
import JournalEntry from './journal/JournalEntry'

const TABS = [
  { label: 'Entries', count: 4, active: true },
  { label: 'Album', active: false },
  { label: 'By plant', active: false },
  { label: 'Milestones', active: false },
]

function buildPreviewEntries(nickname) {
  return [
    {
      avatar: '🌿',
      plantName: nickname,
      eventType: 'milestone',
      eventLabel: 'Milestone',
      time: 'just now',
      text: `${nickname} joined your greenhouse · Day 1`,
      milestone: true,
    },
    {
      avatar: '📷',
      plantName: 'You',
      eventType: 'photo',
      eventLabel: 'Photo',
      time: 'later today',
      text: `First photo of ${nickname}. Aerial roots looking healthy.`,
    },
    {
      avatar: '💧',
      plantName: nickname,
      eventType: 'system',
      eventLabel: 'System',
      time: 'in a few days',
      text: `${nickname} watered · 500ml.`,
    },
    {
      avatar: '📝',
      plantName: 'You',
      eventType: 'care',
      eventLabel: 'Note',
      time: 'next week',
      text: `Pruned a couple of dead leaves. ${nickname} looks happier already.`,
    },
  ]
}

export default function Step6Journal({ onBack, onContinue }) {
  const { data: plants = [] } = usePlants()
  const nickname = plants[0]?.nickname ?? 'Monty'
  const previewEntries = buildPreviewEntries(nickname)

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
          subtitle="Your greenhouse's living record. We mark moments for you; you write the rest."
        >
          Meet the <Emphasis>journal</Emphasis>
        </Heading>
        <div className="mt-4">
          <StepTip icon="🌿">Plants notice what you do — the journal's where you notice back.</StepTip>
        </div>
      </Card.Header>

      <Card.Body className="flex flex-col overflow-hidden">
        <div aria-hidden="true" className="flex items-end gap-0.5">
          {TABS.map((tab, index) => (
            <span
              key={tab.label}
              className={`${
                tab.active
                  ? 'relative z-10 -mb-px px-5 py-3 bg-paper border border-paper-edge border-b-transparent rounded-t-[10px] font-display italic font-medium text-ink shadow-[0_-2px_6px_rgba(80,56,18,0.05),inset_0_1px_0_rgba(255,255,255,0.6)]'
                  : 'px-5 py-2.5 bg-paper-deep border border-paper-edge border-b-transparent rounded-t-[10px] font-display italic font-normal text-ink-soft shadow-[inset_0_2px_0_rgba(255,255,255,0.4)]'
              } ${index >= 2 ? 'hidden sm:inline-flex' : 'inline-flex'}`}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={
                    tab.active
                      ? 'ml-2 px-2 py-0.5 rounded-full bg-mint text-emerald font-sans not-italic text-[10px] font-extrabold tracking-wider'
                      : 'ml-2 px-2 py-0.5 rounded-full bg-ink/5 text-ink-softer font-sans not-italic text-[10px] font-bold tracking-wider'
                  }
                >
                  {tab.count}
                </span>
              )}
            </span>
          ))}
        </div>

        <ul
          aria-label="Journal preview"
          className="bg-paper border border-paper-edge rounded-b-md shadow-warm-sm divide-y divide-paper-edge list-none overflow-hidden"
        >
          {previewEntries.map((entry) => (
            <JournalEntry key={entry.text} {...entry} />
          ))}
        </ul>
      </Card.Body>

      <WizardActions onBack={onBack} continueLabel="Continue →" />
    </form>
  )
}
