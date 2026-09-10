import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Badge from '../../../src/components/ui/Badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('renders a <span> containing the given children', () => {
      render(<Badge>12</Badge>)
      const badge = screen.getByText('12')
      expect(badge.tagName).toBe('SPAN')
    })

    it('applies shared base classes (pill shape, extrabold, tiny text)', () => {
      render(<Badge>Hi</Badge>)
      const badge = screen.getByText('Hi')
      expect(badge).toHaveClass('inline-flex')
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('font-extrabold')
    })
  })

  describe('scheme and variant', () => {
    it('defaults to scheme="neutral" variant="soft" (bg-mint text-ink)', () => {
      render(<Badge>Hi</Badge>)
      const badge = screen.getByText('Hi')
      expect(badge).toHaveClass('bg-mint')
      expect(badge).toHaveClass('text-ink')
    })

    it('applies solid leaf scheme (active nav count)', () => {
      render(
        <Badge scheme="leaf" variant="solid">
          12
        </Badge>,
      )
      const badge = screen.getByText('12')
      expect(badge).toHaveClass('bg-leaf')
      expect(badge).toHaveClass('text-card')
    })

    it('applies soft forest scheme (inactive nav count)', () => {
      render(
        <Badge scheme="forest" variant="soft">
          12
        </Badge>,
      )
      const badge = screen.getByText('12')
      expect(badge).toHaveClass('bg-forest/10')
      expect(badge).toHaveClass('text-ink')
    })

    it('applies outline coral scheme', () => {
      render(
        <Badge scheme="coral" variant="outline">
          Alert
        </Badge>,
      )
      const badge = screen.getByText('Alert')
      expect(badge).toHaveClass('border')
      expect(badge).toHaveClass('border-coral')
      // Text uses coral-deep (not coral) to meet WCAG AA contrast on white.
      expect(badge).toHaveClass('text-coral-deep')
    })

    it('falls back to neutral soft for an unknown scheme/variant combo', () => {
      render(
        // @ts-expect-error — 'nonsense' is deliberately outside Badge's scheme
        // union, proving an unrecognised value falls back to neutral soft.
        <Badge scheme="nonsense" variant="soft">
          X
        </Badge>,
      )
      const badge = screen.getByText('X')
      expect(badge).toHaveClass('bg-mint')
      expect(badge).toHaveClass('text-ink')
    })
  })

  describe('className and kwargs', () => {
    it('merges a user-provided className alongside scheme classes', () => {
      render(<Badge className="uppercase tracking-wider">Thriving</Badge>)
      const badge = screen.getByText('Thriving')
      expect(badge).toHaveClass('uppercase')
      expect(badge).toHaveClass('tracking-wider')
      // Default scheme still applied
      expect(badge).toHaveClass('bg-mint')
    })

    it('forwards passthrough props via ...kwargs', () => {
      render(
        <Badge id="badge-1" data-testid="b1" aria-label="Two items">
          2
        </Badge>,
      )
      const badge = screen.getByTestId('b1')
      expect(badge).toHaveAttribute('id', 'badge-1')
      expect(badge).toHaveAttribute('aria-label', 'Two items')
    })
  })

  describe('self-skip on empty children', () => {
    it('renders null when children is undefined', () => {
      const { container } = render(<Badge>{undefined}</Badge>)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders null when no children are passed at all', () => {
      const { container } = render(<Badge />)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders null when children is null', () => {
      const { container } = render(<Badge>{null}</Badge>)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders null when children is false', () => {
      const { container } = render(<Badge>{false}</Badge>)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders null when children is an empty string', () => {
      const { container } = render(<Badge>{''}</Badge>)
      expect(container).toBeEmptyDOMElement()
    })

    it('still renders when children is 0 (zero is a valid count)', () => {
      render(<Badge>{0}</Badge>)
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('size + icon', () => {
    it('uses the default sm wrapper padding when no icon is provided', () => {
      render(<Badge size="sm">Plain</Badge>)
      const badge = screen.getByText('Plain')
      expect(badge).toHaveClass('px-2')
      expect(badge).not.toHaveClass('pl-1')
    })

    it('switches to wrapperWithIcon padding (pl-1 pr-2.5) when icon is passed at size="sm"', () => {
      render(
        <Badge size="sm" icon={<span data-testid="icon-node">i</span>}>
          With icon
        </Badge>,
      )
      const badge = screen.getByText('With icon')
      expect(badge).toHaveClass('pl-1')
      expect(badge).toHaveClass('pr-2.5')
    })

    it('renders the icon inside an icon-disc wrapper at size="sm"', () => {
      render(
        <Badge size="sm" icon={<span data-testid="icon-node">i</span>}>
          With icon
        </Badge>,
      )
      const iconNode = screen.getByTestId('icon-node')
      const disc = iconNode.parentElement
      expect(disc).toHaveClass('w-4')
      expect(disc).toHaveClass('h-4')
      expect(disc).toHaveClass('rounded-full')
    })

    it('uses md wrapper padding regardless of icon (single md token covers both)', () => {
      render(
        <Badge size="md" icon={<span>i</span>}>
          MD
        </Badge>,
      )
      const badge = screen.getByText('MD')
      expect(badge).toHaveClass('pl-2')
      expect(badge).toHaveClass('py-2')
    })

    it('prefers wrapperWithClear over wrapperWithIcon when both onClear and icon are present', () => {
      render(
        <Badge size="sm" icon={<span>i</span>} onClear={() => {}}>
          Both
        </Badge>,
      )
      const badge = screen.getByText('Both').closest('span')
      // sm wrapperWithClear is `pl-2 pr-0.5`
      expect(badge).toHaveClass('pl-2')
      expect(badge).toHaveClass('pr-0.5')
    })
  })
})
