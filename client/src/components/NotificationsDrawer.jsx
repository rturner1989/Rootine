import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useMarkNotificationRead, useNotifications, useNotificationsSeen } from '../hooks/useNotifications'
import { useNotificationsContext } from '../hooks/useNotificationsContext'
import { NOTIFICATION_FAMILIES } from '../utils/notificationFamilies'
import NotificationItem from './notifications/NotificationItem'
import Action from './ui/Action'
import ActionIcon from './ui/ActionIcon'
import DialogCard from './ui/DialogCard'
import Drawer from './ui/Drawer'
import EmptyState from './ui/EmptyState'
import Heading from './ui/Heading'

const MAIN_VIEW_CAP = 5

const GROUPS = Object.entries(NOTIFICATION_FAMILIES).map(([key, family]) => ({
  key,
  label: family.label,
  icon: family.icon,
  iconClass: family.tint,
  kinds: new Set(family.kinds),
}))

const FALLBACK_GROUP = {
  key: 'system',
  label: 'System',
  icon: '✨',
  iconClass: 'bg-mint text-emerald',
}

function groupNotifications(notifications) {
  const buckets = new Map()
  for (const notification of notifications) {
    const group = GROUPS.find((candidate) => candidate.kinds.has(notification.kind)) ?? FALLBACK_GROUP
    if (!buckets.has(group.key)) buckets.set(group.key, { group, items: [] })
    buckets.get(group.key).items.push(notification)
  }
  return Array.from(buckets.values())
}

// Start of the current calendar week (Monday 00:00 local). Tally reads
// "M this week" so a rolling 7-day cutoff would be misleading on
// Mondays — user expects the count to reset, not roll back six days.
function startOfWeekMs() {
  const now = new Date()
  const day = now.getDay()
  const offsetToMonday = day === 0 ? 6 : day - 1
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(now.getDate() - offsetToMonday)
  return start.getTime()
}

function weekCount(notifications) {
  const cutoff = startOfWeekMs()
  return notifications.filter((notification) => new Date(notification.created_at).getTime() >= cutoff).length
}

function NotificationGroup({ group, items, onViewAll, onClose, capped }) {
  const groupUnread = items.filter((item) => !item.read_at).length
  const visibleItems = capped ? items.slice(0, MAIN_VIEW_CAP) : items
  const hasHiddenInCapped = items.length > MAIN_VIEW_CAP
  // Cap total stagger time so a 25-item expand doesn't take 1.5s. With
  // many items the per-item gap shrinks; with few it stays generous.
  const hiddenItemCount = Math.max(items.length - MAIN_VIEW_CAP, 0)
  const itemStaggerGap = hiddenItemCount > 0 ? Math.min(0.06, 0.5 / hiddenItemCount) : 0.06

  const icon = (
    <span
      aria-hidden="true"
      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] ${group.iconClass}`}
    >
      {group.icon}
    </span>
  )

  const badge = groupUnread > 0 && (
    <>
      <span className="sr-only">{groupUnread} unread</span>
      <span
        aria-hidden="true"
        className="px-1.5 py-px rounded-full bg-coral text-paper text-[9px] font-extrabold tracking-[0.06em]"
      >
        {groupUnread} NEW
      </span>
    </>
  )

  return (
    <DialogCard
      icon={icon}
      label={group.label}
      badge={badge}
      expanded={!capped}
      viewAll={hasHiddenInCapped ? { count: items.length, onClick: onViewAll } : null}
    >
      <ul className="flex flex-col gap-0.5">
        <AnimatePresence initial={false}>
          {visibleItems.map((notification, index) => {
            const isNewlyRevealed = index >= MAIN_VIEW_CAP
            return (
              <motion.li
                key={notification.id}
                initial={isNewlyRevealed ? { opacity: 0, y: 8 } : false}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.18,
                    ease: 'easeOut',
                    delay: 0.4 + (index - MAIN_VIEW_CAP) * itemStaggerGap,
                  },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.12, ease: 'easeOut' },
                }}
              >
                <NotificationItem notification={notification} onClose={onClose} />
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </DialogCard>
  )
}

export default function NotificationsDrawer() {
  const { open, closeDrawer } = useNotificationsContext()
  const { data, isLoading } = useNotifications()
  const markSeen = useNotificationsSeen()
  const markRead = useMarkNotificationRead()
  const [viewKey, setViewKey] = useState(null)
  // Header swap lags the body — title + back-arrow change once items
  // have settled, so the eye finishes on the body content rather than
  // the chrome. Reverts immediately on collapse so back-press feels
  // responsive.
  const [headerKey, setHeaderKey] = useState(null)
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }

  useEffect(() => {
    if (!viewKey) {
      setHeaderKey(null)
      return
    }
    const handle = setTimeout(() => setHeaderKey(viewKey), 800)
    return () => clearTimeout(handle)
  }, [viewKey])

  // useMutation rebuilds its return object on every render but the
  // underlying mutate function is stable. Cache it in a ref so the
  // open-effect's dep array can be a primitive and the mark-seen call
  // only fires when open flips to true.
  const markSeenRef = useRef(markSeen.mutate)
  markSeenRef.current = markSeen.mutate

  useEffect(() => {
    if (!open) {
      setViewKey(null)
      return
    }
    markSeenRef.current()
  }, [open])

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unread_count ?? 0
  const grouped = groupNotifications(notifications)
  const week = weekCount(notifications)
  const expandedGroup = viewKey ? grouped.find((entry) => entry.group.key === viewKey) : null
  const headerGroup = headerKey ? grouped.find((entry) => entry.group.key === headerKey) : null

  function handleMarkAllRead() {
    for (const notification of notifications) {
      if (!notification.read_at) markRead.mutate(notification.id)
    }
  }

  function renderBody() {
    if (isLoading) return <p className="px-3 py-6 text-sm text-ink-softer">Loading…</p>
    if (notifications.length === 0) {
      return (
        <EmptyState
          variant="inline"
          tone="forest"
          icon={<span aria-hidden="true">🌿</span>}
          title={
            <>
              You're all <em className="italic">caught up</em>
            </>
          }
          description="New notifications land here when plants need you or milestones arrive."
          headingLevel="h3"
          className="py-10"
        />
      )
    }
    return (
      <AnimatePresence mode="popLayout" initial={false}>
        {(expandedGroup ? [expandedGroup] : grouped).map(({ group, items }) => (
          <NotificationGroup
            key={group.key}
            group={group}
            items={items}
            capped={!expandedGroup}
            onViewAll={() => setViewKey(group.key)}
            onClose={closeDrawer}
          />
        ))}
      </AnimatePresence>
    )
  }

  return (
    <Drawer open={open} onClose={closeDrawer} title="Notifications">
      <header className="flex items-center justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <AnimatePresence initial={false}>
            {headerGroup && (
              <motion.div
                key="back"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={transition}
                className="overflow-hidden"
              >
                <ActionIcon
                  icon={faArrowLeft}
                  label="Back to all notifications"
                  onClick={() => setViewKey(null)}
                  scheme="ink"
                  className="shrink-0"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={headerGroup ? headerGroup.group.key : 'index'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <Heading as="h2" variant="panel">
                {headerGroup ? headerGroup.group.label : 'Notifications'}
              </Heading>
            </motion.div>
          </AnimatePresence>
        </div>
      </header>

      <p aria-live="polite" className="sr-only">
        {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
      </p>

      <div className="flex items-center justify-between px-4 pb-2.5 text-[11px] font-semibold text-ink-softer shrink-0">
        <span>
          {unreadCount} unread · {week} this week
        </span>
        {unreadCount > 0 && (
          <Action
            variant="unstyled"
            onClick={handleMarkAllRead}
            className="text-emerald font-bold underline decoration-dotted"
          >
            Mark all as read
          </Action>
        )}
      </div>

      <div
        className={`flex-1 min-h-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3 ${
          expandedGroup ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {renderBody()}
      </div>
    </Drawer>
  )
}
