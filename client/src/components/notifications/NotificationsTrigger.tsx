import { faBell } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNotifications } from '../../hooks/useNotifications'
import { useNotificationsContext } from '../../hooks/useNotificationsContext'
import Action from '../ui/Action'
import Tooltip from '../ui/Tooltip'

export type NotificationsTriggerSize = 'sm' | 'lg'

export type NotificationsTriggerProps = {
  size?: NotificationsTriggerSize
}

// Bell icon in app chrome — no room for a WidgetError panel, and the
// drawer it opens already carries the full error treatment. On a failed
// request this stays a plain bell (no unread badge, since the count is
// unknown) but swaps its accessible name/tooltip so assistive tech and
// hover users aren't told "no notifications" when the truth is "we
// don't know".
function notificationsLabel(isError: boolean, unread: number): string {
  if (isError) return 'Notifications unavailable'
  if (unread > 0) return `Notifications (${unread} unread)`
  return 'Notifications'
}

export default function NotificationsTrigger({ size = 'sm' }: NotificationsTriggerProps) {
  const { openDrawer } = useNotificationsContext()
  const { data, isError } = useNotifications()
  const unread = data?.unread_count ?? 0

  const dimensions = size === 'lg' ? 'w-9 h-9' : 'w-[26px] h-[26px]'
  const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'

  return (
    <Action
      variant="unstyled"
      onClick={openDrawer}
      aria-label={notificationsLabel(isError, unread)}
      className={`${dimensions} relative group rounded-full bg-paper-deep text-ink-soft hover:text-ink hover:bg-mint/60 transition-colors flex items-center justify-center shrink-0`}
    >
      <FontAwesomeIcon icon={faBell} className={iconSize} />
      {!isError && unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-coral text-paper text-[9px] font-extrabold flex items-center justify-center leading-none ring-2 ring-paper"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
      <Tooltip placement="bottom">{isError ? 'Notifications unavailable' : 'Notifications'}</Tooltip>
    </Action>
  )
}
