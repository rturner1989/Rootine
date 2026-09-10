import { useNavigate } from 'react-router-dom'
import { useMarkNotificationRead } from '../../hooks/useNotifications'
import type { AppNotification } from '../../types/notification'
import Action from '../ui/Action'

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`

  return new Date(isoString).toLocaleDateString()
}

export type NotificationItemProps = {
  notification: AppNotification
  onClose?: () => void
}

export default function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()
  const unread = !notification.read_at

  function handleClick() {
    if (unread) markRead.mutate(notification.id)
    if (notification.url) navigate(notification.url)
    onClose?.()
  }

  return (
    <Action
      variant="unstyled"
      onClick={handleClick}
      className="group relative w-full flex items-start gap-2.5 px-2 py-2 text-left rounded-md cursor-pointer hover:bg-paper-deep/60 transition-colors"
    >
      {unread && <span className="sr-only">Unread.</span>}
      <span
        aria-hidden="true"
        className={`w-7 h-7 rounded-full bg-[image:var(--gradient-paper)] flex items-center justify-center text-[13px] shrink-0 ring-2 ${
          unread ? 'ring-coral' : 'ring-paper-edge'
        }`}
      >
        🌱
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-softer mb-0.5">
          {/* params is Record<string, unknown> — every notifier's params shape isn't
          modeled (types/notification.ts); CareDue::* always sends plant_nickname
          as a string. */}
          <span className="text-emerald">{(notification.params?.plant_nickname as string | undefined) ?? 'Plant'}</span>
          {notification.meta && <span> · {notification.meta}</span>}
        </span>
        <span className="block text-xs text-ink leading-snug">{notification.title}</span>
      </span>
      <span className="font-display italic text-[10px] text-ink-softer shrink-0 pt-0.5">
        {timeAgo(notification.created_at)}
      </span>
    </Action>
  )
}
