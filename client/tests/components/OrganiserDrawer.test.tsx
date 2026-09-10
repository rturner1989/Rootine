import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import OrganiserDrawer from '../../src/components/OrganiserDrawer'
import { OrganiserProvider } from '../../src/context/OrganiserContext'
import { useOrganiserContext } from '../../src/hooks/useOrganiserContext'

// motion/react's `motion` export can't be reimplemented structurally for a
// Proxy mock (see AchievementSplash.test.tsx for the same rationale) — this
// narrows to any-tag-renders-a-div, discarding animation-only props. Drawer
// composes Dialog under the hood, which is why useDragControls is mocked
// too even though OrganiserDrawer never imports motion/react directly.
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
    useReducedMotion: () => false,
    useDragControls: () => ({ start: () => {} }),
  }
})

function Wrapper({ children, route = '/' }: { children: ReactNode; route?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <OrganiserProvider>{children}</OrganiserProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function Harness() {
  const ctx = useOrganiserContext()
  return (
    <>
      <button type="button" onClick={ctx.openDrawer}>
        open
      </button>
      <OrganiserDrawer />
    </>
  )
}

describe('Organiser', () => {
  it('renders nothing visible when drawer is closed', () => {
    render(<OrganiserDrawer />, { wrapper: Wrapper })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('on Today (/), drawer body shows Goals only', async () => {
    const user = userEvent.setup()
    render(<Harness />, { wrapper: ({ children }) => <Wrapper route="/">{children}</Wrapper> })
    await user.click(screen.getByText('open'))
    expect(screen.getByRole('dialog', { name: 'Organiser' })).toBeInTheDocument()
    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.queryByText('Weather')).not.toBeInTheDocument()
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
    expect(screen.queryByText('Recently earned')).not.toBeInTheDocument()
  })

  it('off Today, drawer body shows Weather + Streak + Goals (no achievements; week+rituals live on Today)', async () => {
    const user = userEvent.setup()
    render(<Harness />, { wrapper: ({ children }) => <Wrapper route="/house">{children}</Wrapper> })
    await user.click(screen.getByText('open'))
    expect(screen.getByText('Weather')).toBeInTheDocument()
    expect(screen.getByText('Visit streak')).toBeInTheDocument()
    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
    expect(screen.queryByText('Recently earned')).not.toBeInTheDocument()
  })
})
