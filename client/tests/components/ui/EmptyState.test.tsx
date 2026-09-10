import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { EmptyStateTone } from '../../../src/components/ui/EmptyState'
import EmptyState from '../../../src/components/ui/EmptyState'

describe('EmptyState', () => {
  describe('slot rendering (defaults to card variant)', () => {
    it('renders only the description when other slots are omitted', () => {
      render(<EmptyState description="No species found." />)
      expect(screen.getByText('No species found.')).toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders the title in an <h2> by default', () => {
      render(<EmptyState title="No plants yet" />)
      const heading = screen.getByRole('heading', { name: 'No plants yet' })
      expect(heading.tagName).toBe('H2')
    })

    it('promotes the title to an <h1> when headingLevel="h1" is passed', () => {
      render(<EmptyState title="All caught up!" headingLevel="h1" />)
      expect(screen.getByRole('heading', { name: 'All caught up!' }).tagName).toBe('H1')
    })

    it('accepts a ReactNode title (so callers can italicise a word with <em>)', () => {
      render(
        <EmptyState
          title={
            <>
              Your greenhouse is <em>waiting</em>
            </>
          }
        />,
      )
      const heading = screen.getByRole('heading')
      expect(heading).toHaveTextContent('Your greenhouse is waiting')
      expect(heading.querySelector('em')).toBeInTheDocument()
    })

    it('renders a hint string under the description', () => {
      render(<EmptyState description="Filtered." hint="Active filters: 3" />)
      expect(screen.getByText('Active filters: 3')).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('accepts a single action node via the `actions` prop', () => {
      render(<EmptyState actions={<button type="button">Add</button>} />)
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    })

    it('accepts an array of action nodes via `actions`', () => {
      render(
        <EmptyState
          actions={[
            <button key="a" type="button">
              Primary
            </button>,
            <button key="b" type="button">
              Secondary
            </button>,
          ]}
        />,
      )
      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument()
    })

    it('filters out falsy entries in the `actions` array', () => {
      render(
        <EmptyState
          actions={[
            <button key="a" type="button">
              Primary
            </button>,
            null,
            false,
          ]}
        />,
      )
      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()
    })
  })

  describe('tone (card variant)', () => {
    it.each<EmptyStateTone>([
      'mint',
      'forest',
      'sunshine',
      'coral',
      'sky',
    ])('applies the %s tone class to the disc', (tone) => {
      render(<EmptyState icon={<span data-testid="icon">i</span>} tone={tone} />)
      const disc = screen.getByTestId('icon').parentElement as HTMLElement
      // Each tone has a distinct gradient — assert the disc has a
      // background gradient class (not the solid bg-mint of the old API).
      expect(disc.className).toMatch(/bg-\[linear-gradient/)
    })

    it('defaults to mint tone when none provided', () => {
      render(<EmptyState icon={<span data-testid="icon">i</span>} />)
      const disc = screen.getByTestId('icon').parentElement as HTMLElement
      expect(disc.className).toContain('text-emerald')
    })

    it('forest tone uses paper text (only light-text tone)', () => {
      render(<EmptyState icon={<span data-testid="icon">i</span>} tone="forest" />)
      const disc = screen.getByTestId('icon').parentElement as HTMLElement
      expect(disc.className).toContain('text-paper')
    })
  })

  describe('card variant chrome', () => {
    it('renders inside a paper-bg card with warm-md shadow + min-height', () => {
      const { container } = render(<EmptyState description="hi" />)
      const root = container.firstChild as HTMLElement
      expect(root.className).toContain('bg-paper')
      expect(root.className).toContain('min-h-[380px]')
      expect(root.className).toContain('empty-card-blob')
    })
  })

  describe('inline variant', () => {
    it('drops the card chrome (no paper bg, no min-height, no blob)', () => {
      const { container } = render(<EmptyState variant="inline" description="hi" />)
      const root = container.firstChild as HTMLElement
      expect(root.className).not.toContain('bg-paper')
      expect(root.className).not.toContain('min-h-[380px]')
      expect(root.className).not.toContain('empty-card-blob')
    })

    it('still centers its slots in a flex column', () => {
      const { container } = render(<EmptyState variant="inline" description="hi" />)
      const root = container.firstChild as HTMLElement
      expect(root.className).toContain('flex-col')
      expect(root.className).toContain('items-center')
      expect(root.className).toContain('text-center')
    })

    it("does NOT bake in vertical padding — outer spacing is the caller's job", () => {
      const { container } = render(<EmptyState variant="inline" description="hi" />)
      expect((container.firstChild as HTMLElement).className).not.toMatch(/\bpy-/)
    })
  })

  describe('className passthrough', () => {
    it('merges a user-provided className onto the outer container', () => {
      const { container } = render(<EmptyState variant="inline" description="hi" className="custom-thing" />)
      expect((container.firstChild as HTMLElement).className).toContain('custom-thing')
    })
  })
})
