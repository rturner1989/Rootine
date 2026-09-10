import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PageHeader from '../../../src/components/ui/PageHeader'

describe('PageHeader', () => {
  it('renders the heading from children', () => {
    render(<PageHeader>Browse your plants</PageHeader>)
    expect(screen.getByRole('heading', { level: 1, name: 'Browse your plants' })).toBeInTheDocument()
  })

  it('renders the eyebrow when provided', () => {
    render(<PageHeader eyebrow="Your greenhouse">Browse your plants</PageHeader>)
    expect(screen.getByText('Your greenhouse')).toBeInTheDocument()
  })

  it('omits the eyebrow when not provided', () => {
    render(<PageHeader>Browse your plants</PageHeader>)
    expect(screen.queryByText(/greenhouse/i)).not.toBeInTheDocument()
  })

  it('renders the meta line when provided', () => {
    render(<PageHeader meta="12 plants · 5 spaces">Browse your plants</PageHeader>)
    expect(screen.getByText('12 plants · 5 spaces')).toBeInTheDocument()
  })

  it('omits the meta line when not provided', () => {
    render(<PageHeader>Browse your plants</PageHeader>)
    expect(screen.queryByText(/plants ·/i)).not.toBeInTheDocument()
  })

  it('renders the actions slot when provided', () => {
    render(<PageHeader actions={<button type="button">View toggle</button>}>Browse your plants</PageHeader>)
    expect(screen.getByRole('button', { name: 'View toggle' })).toBeInTheDocument()
  })

  it('uses the display heading variant by default', () => {
    render(<PageHeader>Browse your plants</PageHeader>)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toMatch(/text-\[34px\]/)
  })

  it('honours an alternate headingVariant prop', () => {
    render(<PageHeader headingVariant="display-lg">Hi, Rob</PageHeader>)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toMatch(/text-\[44px\]/)
  })

  describe('compactMobile at a mobile viewport', () => {
    // jsdom's matchMedia is stubbed no-match by default (tests/setup.ts), so
    // useMediaQuery reports desktop. Override it here, the same way
    // Tooltip.test.jsx / ActionIcon.test.jsx drive their own media-query
    // gates, to simulate the `(max-width: 639px)` match PageHeader checks.
    const originalMatchMedia = window.matchMedia

    beforeEach(() => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    })

    afterEach(() => {
      window.matchMedia = originalMatchMedia
    })

    it('still renders an h1 when compactMobile is set — regression for the missing page title', () => {
      render(
        <PageHeader eyebrow="Your journal" compactMobile>
          Everything that has happened
        </PageHeader>,
      )
      expect(screen.getByRole('heading', { level: 1, name: 'Everything that has happened' })).toBeInTheDocument()
    })

    it('renders the eyebrow as an h3 above the h1', () => {
      render(
        <PageHeader eyebrow="Your journal" compactMobile>
          Everything that has happened
        </PageHeader>,
      )
      expect(screen.getByRole('heading', { level: 3, name: 'Your journal' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Everything that has happened' })).toBeInTheDocument()
    })

    it('shrinks the h1 to the panel type scale instead of dropping it', () => {
      render(
        <PageHeader eyebrow="Your journal" compactMobile>
          Everything that has happened
        </PageHeader>,
      )
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.className).toMatch(/text-\[22px\]/)
    })
  })
})
