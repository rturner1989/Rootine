import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationItem from '../../../src/components/notifications/NotificationItem'
import type { AppNotification } from '../../../src/types/notification'

const navigate = vi.fn()
const markRead = vi.fn()
const dismiss = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('../../../src/hooks/useNotifications', () => ({
  useMarkNotificationRead: () => ({ mutate: markRead }),
  useDismissNotification: () => ({ mutate: dismiss }),
}))

const CARE_DUE: AppNotification = {
  id: 1,
  kind: 'care_due_water',
  title: 'Monty needs water',
  meta: '3 days overdue',
  url: '/plants/12',
  params: { plant_nickname: 'Monty' },
  read_at: null,
  seen_at: null,
  created_at: '2026-09-11T09:00:00Z',
}

const ACHIEVEMENT: AppNotification = {
  ...CARE_DUE,
  id: 2,
  kind: 'achievement',
  title: 'Achievement unlocked',
  meta: '💧 First care logged',
  url: null,
}

function renderItem(notification: AppNotification, onClose: () => void) {
  return render(<NotificationItem notification={notification} onClose={onClose} />)
}

// The row and its dismiss control are siblings, and the dismiss label quotes
// the title — so match the row by what only it carries.
function row(notification: AppNotification) {
  return screen.getByRole('button', {
    name: (accessibleName) => accessibleName.includes(notification.title) && !accessibleName.startsWith('Dismiss'),
  })
}

beforeEach(() => {
  navigate.mockClear()
  markRead.mockClear()
  dismiss.mockClear()
})

describe('NotificationItem', () => {
  it('marks an unread notification read on click', async () => {
    renderItem(ACHIEVEMENT, vi.fn())

    await userEvent.click(row(ACHIEVEMENT))

    expect(markRead).toHaveBeenCalledWith(ACHIEVEMENT.id)
  })

  it('leaves the drawer open for a notification with nowhere to go', async () => {
    const onClose = vi.fn()
    renderItem(ACHIEVEMENT, onClose)

    await userEvent.click(row(ACHIEVEMENT))

    expect(navigate).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('navigates and closes the drawer when the notification has a url', async () => {
    const onClose = vi.fn()
    renderItem(CARE_DUE, onClose)

    await userEvent.click(row(CARE_DUE))

    expect(navigate).toHaveBeenCalledWith(CARE_DUE.url)
    expect(onClose).toHaveBeenCalled()
  })

  it('dismisses without marking read or navigating', async () => {
    const onClose = vi.fn()
    renderItem(CARE_DUE, onClose)

    await userEvent.click(screen.getByRole('button', { name: /^Dismiss/ }))

    expect(dismiss).toHaveBeenCalledWith(CARE_DUE.id)
    expect(markRead).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('names the dismiss control after the notification it removes', () => {
    renderItem(ACHIEVEMENT, vi.fn())

    expect(screen.getByRole('button', { name: `Dismiss ${ACHIEVEMENT.title}` })).toBeInTheDocument()
  })

  it('does not re-mark a notification that is already read', async () => {
    const read = { ...ACHIEVEMENT, read_at: '2026-09-11T10:00:00Z' }
    renderItem(read, vi.fn())

    await userEvent.click(row(read))

    expect(markRead).not.toHaveBeenCalled()
  })
})
