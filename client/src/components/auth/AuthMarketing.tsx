import Logo from '../Logo'
import Badge from '../ui/Badge'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'

export default function AuthMarketing() {
  return (
    <div className="flex-1 flex flex-col gap-6 p-9 lg:p-11">
      <Logo className="text-paper" />

      <Heading variant="display-lg" className="max-w-[360px]" preheading="Plant care without the spreadsheet">
        Care that <Emphasis variant="sunshine">actually fits</Emphasis> your week.
      </Heading>

      <p className="text-base text-paper/80 max-w-[360px] leading-relaxed">
        Personality-driven reminders. Schedules that learn from your space. Photos, milestones, and a streak that
        quietly cheers you on.
      </p>

      <ul className="mt-auto flex flex-col gap-2.5">
        <Badge as="li" scheme="glass" size="md" icon="🌿">
          <em className="font-display italic text-sunshine">Monstera</em> needs water · 3d overdue
        </Badge>
        <Badge as="li" scheme="glass" size="md" icon="🎂">
          <em className="font-display italic text-sunshine">Basil</em> · 30 days with you today
        </Badge>
        <Badge as="li" scheme="glass" size="md" icon="🌧">
          Rain Sunday · outdoor schedule shifted
        </Badge>
      </ul>

      <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-paper/45">
        · Indie · No spam · Your data exports ·
      </p>
    </div>
  )
}
