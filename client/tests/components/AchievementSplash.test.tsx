import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AchievementSplash from '../../src/components/AchievementSplash'
import type { useUnseenAchievements } from '../../src/hooks/useUnseenAchievements'
import type { Achievement } from '../../src/types/achievement'

// motion/react's `motion` export is a proxy typed via framer-motion's
// generic HTMLMotionComponents/SVGMotionComponents union — reimplementing
// that structurally for a Proxy mock isn't practical, so this narrows to
// the concrete shape AchievementSplash actually reaches for: any tag via
// `motion.<tag>` rendering a plain element, discarding animation-only props.
vi.mock('motion/react', () => {
  const motion = new Proxy(
    { create: (Component: ComponentType) => Component },
    {
      get: (target: Record<string, unknown>, prop: string) => {
        if (prop in target) return target[prop]
        return ({ children, ...kwargs }: { children?: ReactNode; [key: string]: unknown }) => (
          <div {...kwargs}>{children}</div>
        )
      },
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  }
})

function achievementFixture(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 7,
    kind: 'login_streak_7',
    label: '7-day visit streak',
    emoji: '⭐',
    earned_at: '2026-05-03T15:00:00Z',
    seen_at: null,
    metadata: {},
    ...overrides,
  }
}

const markSeenMock = vi.fn()
let queueMock: Achievement[] = []

// AchievementSplash only reads `achievements` and calls `markSeen` — it
// never reads `isLoading`.
vi.mock(
  '../../src/hooks/useUnseenAchievements',
  (): {
    useUnseenAchievements: () => Pick<ReturnType<typeof useUnseenAchievements>, 'achievements' | 'markSeen'>
  } => ({
    useUnseenAchievements: () => ({ achievements: queueMock, markSeen: markSeenMock }),
  }),
)

describe('<AchievementSplash />', () => {
  beforeEach(() => {
    markSeenMock.mockClear()
    queueMock = []
  })

  it('renders nothing when the queue is empty', () => {
    queueMock = []
    const { container } = render(<AchievementSplash />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the front of the queue with emoji + label', () => {
    queueMock = [achievementFixture()]
    render(<AchievementSplash />)

    expect(screen.getByText('⭐')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '7-day visit streak' })).toBeInTheDocument()
    expect(screen.getByText('Achievement unlocked')).toBeInTheDocument()
  })

  it('uses dialog semantics for screen readers', () => {
    queueMock = [achievementFixture()]
    render(<AchievementSplash />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'achievement-splash-title')
  })

  it('calls markSeen with the front entry id on Continue', async () => {
    queueMock = [achievementFixture()]
    render(<AchievementSplash />)

    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(markSeenMock).toHaveBeenCalledWith(7)
  })

  it('renders only the front of the queue when multiple are pending', () => {
    queueMock = [
      achievementFixture(),
      achievementFixture({ id: 8, kind: 'login_streak_30', label: '30-day visit streak' }),
    ]
    render(<AchievementSplash />)

    expect(screen.getByRole('heading', { name: '7-day visit streak' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '30-day visit streak' })).not.toBeInTheDocument()
  })
})
