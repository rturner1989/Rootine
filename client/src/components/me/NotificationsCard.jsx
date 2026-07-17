import { useId } from 'react'
import { NOTIFICATION_FAMILIES } from '../../utils/notificationFamilies'
import Card from '../ui/Card'
import Heading from '../ui/Heading'
import Toggle from '../ui/Toggle'
import SettingRow from './SettingRow'

// One row per notification family that has a preference column behind it.
// Meta describes what actually gets sent — the sweeper runs once daily,
// so mockup 24's "evening nudge if missed" would be a promise we don't
// keep. Rescue alerts, weather and quiet hours are absent for the same
// reason: no notifier, and no push channel to be quiet on.
//
// Muting both stops new notifications and hides the family's existing
// ones (User#visible_notifications) — the drawer changing is the only
// immediate proof the switch did anything.
const ROWS = [
  {
    field: 'notify_care_reminders',
    family: NOTIFICATION_FAMILIES.care,
    title: 'Care reminders',
    meta: 'A daily nudge when a plant needs water or feeding',
  },
  {
    field: 'notify_achievements',
    family: NOTIFICATION_FAMILIES.achievement,
    title: 'Achievements',
    meta: 'Firsts, care streaks, and plant anniversaries',
  },
]

export default function NotificationsCard({ profile, onChange, disabled = false }) {
  const baseId = useId()

  return (
    <Card variant="paper-warm" className="px-6 py-5 gap-1">
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <Heading as="h2" variant="panel">
          <em className="text-emerald">Notifications</em>
        </Heading>
        <span className="eyebrow-label ml-auto text-ink-soft">In-app</span>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed mb-2">
        What reaches your bell. Turning one off hides it from your notifications too — turn it back on and it all
        returns, nothing is deleted.
      </p>

      <div>
        {ROWS.map((row) => {
          const metaId = `${baseId}-${row.field}`
          return (
            <SettingRow
              key={row.field}
              icon={row.family.icon}
              tint={row.family.tint}
              title={row.title}
              meta={row.meta}
              metaId={metaId}
            >
              <Toggle
                checked={Boolean(profile?.[row.field])}
                onChange={(next) => onChange(row.field, next, row.title)}
                label={row.title}
                aria-describedby={metaId}
                disabled={disabled}
              />
            </SettingRow>
          )
        })}
      </div>
    </Card>
  )
}
