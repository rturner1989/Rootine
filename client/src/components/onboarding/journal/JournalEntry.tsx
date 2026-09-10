import type { ReactNode } from 'react'

const TYPE_PILL = {
  milestone: 'bg-sunshine/20 text-sunshine-deep',
  system: 'bg-sunshine/20 text-sunshine-deep',
  care: 'bg-mint text-emerald',
  photo: 'bg-coral/15 text-coral-deep',
}

type JournalEntryEventType = keyof typeof TYPE_PILL

export type JournalEntryProps = {
  avatar: ReactNode
  plantName?: string
  eventType: JournalEntryEventType
  eventLabel: string
  time: string
  text: string
  milestone?: boolean
}

export default function JournalEntry({
  avatar,
  plantName,
  eventType,
  eventLabel,
  time,
  text,
  milestone = false,
}: JournalEntryProps) {
  const rowBg = milestone ? 'bg-gradient-to-r from-sunshine/10 to-transparent' : ''
  const textClass = milestone
    ? 'font-display italic text-sm text-sunshine-deep leading-snug'
    : 'text-[13px] text-ink leading-snug'

  return (
    <li className={`grid grid-cols-[36px_1fr_auto] gap-3 px-4 py-2.5 items-start ${rowBg}`}>
      <span
        aria-hidden="true"
        className="w-9 h-9 rounded-full bg-paper-deep border border-paper-edge flex items-center justify-center text-base"
      >
        {avatar}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          {plantName && (
            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald">{plantName}</span>
          )}
          <span
            className={`px-1.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-[0.12em] ${TYPE_PILL[eventType]}`}
          >
            {eventLabel}
          </span>
        </div>
        <p className={`text-left ${textClass}`}>{text}</p>
      </div>
      <span className="font-display italic text-xs text-ink-soft self-center">{time}</span>
    </li>
  )
}
