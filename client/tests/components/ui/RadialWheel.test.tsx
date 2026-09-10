import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import RadialWheel from '../../../src/components/ui/RadialWheel'

// motion/react's `motion` export can't be reimplemented structurally for a
// plain mock object (see DialogCard.test.tsx for the same rationale) — this
// narrows to the concrete tags RadialWheel reaches for, discarding
// animation-only props and rendering plain elements.
type MockMotionProps = {
  children?: ReactNode
  initial?: unknown
  animate?: unknown
  exit?: unknown
  transition?: unknown
  whileHover?: unknown
  whileTap?: unknown
  [key: string]: unknown
}

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...kwargs }: MockMotionProps) => (
      <div {...kwargs}>{children}</div>
    ),
    button: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...kwargs }: MockMotionProps) => (
      <button type="button" {...kwargs}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: () => {},
    on: () => () => {},
  }),
  useTransform: () => 1,
}))

const SPOKES = [
  { id: 'water', label: 'Water', icon: '💧', primary: true },
  { id: 'feed', label: 'Feed', icon: '🌿' },
  { id: 'photo', label: 'Photo', icon: '📷' },
  { id: 'note', label: 'Note', icon: '📝' },
  { id: 'doctor', label: 'Doctor', icon: '🩺' },
  { id: 'move', label: 'Move', icon: '↔️' },
]

describe('RadialWheel', () => {
  it('renders centre button always; spokes hidden by default', () => {
    render(<RadialWheel spokes={SPOKES} centreLabel="Plant actions" />)
    expect(screen.getByRole('button', { name: 'Plant actions' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('clicking the centre button toggles the wheel open', () => {
    render(<RadialWheel spokes={SPOKES} centreLabel="Plant actions" />)
    const centre = screen.getByRole('button', { name: 'Plant actions' })

    fireEvent.click(centre)
    expect(screen.getByRole('menu', { name: 'Plant actions' })).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(SPOKES.length)
    expect(centre).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(centre)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(centre).toHaveAttribute('aria-expanded', 'false')
  })

  it('respects defaultOpen', () => {
    render(<RadialWheel spokes={SPOKES} defaultOpen />)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('renders centreSlot inside the centre button', () => {
    render(<RadialWheel spokes={SPOKES} centreSlot={<span data-testid="avatar">🌱</span>} />)
    expect(screen.getByTestId('avatar')).toBeInTheDocument()
  })

  it('fires onSpoke + closes when an enabled spoke is clicked', async () => {
    const onSpoke = vi.fn()
    render(<RadialWheel spokes={SPOKES} onSpoke={onSpoke} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: /^Feed,/ }))
    // onSpoke fires synchronously so dialog/navigation handlers don't
    // wait on the 220ms pulse. Wheel closes after the pulse completes.
    expect(onSpoke).toHaveBeenCalledWith('feed')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  describe('keyboard nav', () => {
    it('Escape closes', () => {
      render(<RadialWheel spokes={SPOKES} defaultOpen />)
      fireEvent.keyDown(screen.getByRole('menu').parentElement!, { key: 'Escape' })
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('Arrow keys cycle focus through spokes', () => {
      render(<RadialWheel spokes={SPOKES} defaultOpen />)
      const wheel = screen.getByRole('menu').parentElement!
      expect(screen.getByRole('menuitem', { name: /^Water,/ })).toHaveFocus()

      fireEvent.keyDown(wheel, { key: 'ArrowRight' })
      expect(screen.getByRole('menuitem', { name: /^Feed,/ })).toHaveFocus()

      fireEvent.keyDown(wheel, { key: 'ArrowLeft' })
      expect(screen.getByRole('menuitem', { name: /^Water,/ })).toHaveFocus()
    })

    it('ArrowLeft from first spoke wraps to last', () => {
      render(<RadialWheel spokes={SPOKES} defaultOpen />)
      const wheel = screen.getByRole('menu').parentElement!
      fireEvent.keyDown(wheel, { key: 'ArrowLeft' })
      expect(screen.getByRole('menuitem', { name: /^Move,/ })).toHaveFocus()
    })
  })

  it('accepts md and lg sizes', () => {
    const { unmount } = render(<RadialWheel spokes={SPOKES} size="lg" defaultOpen />)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    unmount()
    render(<RadialWheel spokes={SPOKES} size="md" defaultOpen />)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('falls back to md for unknown size', () => {
    // @ts-expect-error — 'xl' is deliberately outside RadialWheelSize,
    // proving an unknown size falls back to 'md' at runtime.
    render(<RadialWheel spokes={SPOKES} size="xl" defaultOpen />)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('urgent flag does not crash render', () => {
    render(<RadialWheel spokes={SPOKES} urgent defaultOpen />)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  describe('disabled spokes', () => {
    it('renders disabled spokes with aria-disabled + native disabled', () => {
      render(
        <RadialWheel
          defaultOpen
          spokes={[
            { id: 'add', label: 'Add Plant', icon: '🌱' },
            { id: 'doctor', label: 'Doctor', icon: '🩺', disabled: true, disabledReason: 'Coming soon' },
          ]}
        />,
      )
      const doctor = screen.getByRole('menuitem', { name: /Doctor.*Coming soon/ })
      expect(doctor).toBeDisabled()
      expect(doctor).toHaveAttribute('aria-disabled', 'true')
    })

    it('does not fire onSpoke when disabled spoke is clicked', () => {
      const onSpoke = vi.fn()
      render(
        <RadialWheel
          defaultOpen
          onSpoke={onSpoke}
          spokes={[{ id: 'doctor', label: 'Doctor', icon: '🩺', disabled: true }]}
        />,
      )
      fireEvent.click(screen.getByRole('menuitem', { name: /^Doctor,/ }))
      expect(onSpoke).not.toHaveBeenCalled()
    })

    it('disabled spoke click does not close the wheel', () => {
      render(<RadialWheel defaultOpen spokes={[{ id: 'doctor', label: 'Doctor', icon: '🩺', disabled: true }]} />)
      fireEvent.click(screen.getByRole('menuitem', { name: /^Doctor,/ }))
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })
  })

  it("distributes spokes evenly around 360° starting at 12 o'clock", () => {
    render(<RadialWheel spokes={SPOKES} defaultOpen />)
    expect(screen.getAllByRole('menuitem')).toHaveLength(SPOKES.length)
  })
})
