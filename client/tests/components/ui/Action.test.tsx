import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Action from '../../../src/components/ui/Action'

// Small helper so Action's <Link> branch has a router above it.
function renderWithRouter(ui: ReactElement) {
  return render(ui, { wrapper: MemoryRouter })
}

describe('Action', () => {
  describe('element selection', () => {
    it('renders a <button> when neither to nor href is given', () => {
      render(<Action onClick={() => {}}>Save</Action>)
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('renders a <Link> when `to` is given', () => {
      renderWithRouter(<Action to="/foo">Go</Action>)
      const link = screen.getByRole('link', { name: 'Go' })
      expect(link).toHaveAttribute('href', '/foo')
    })

    it('renders an <a> when `href` is given', () => {
      render(<Action href="https://example.com">Docs</Action>)
      expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', 'https://example.com')
    })
  })

  describe('button defaults', () => {
    it('defaults <button> to type="button" to prevent accidental form submission', () => {
      render(<Action>Click</Action>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('allows overriding type="submit" explicitly', () => {
      render(<Action type="submit">Submit</Action>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('fires onClick when clicked', async () => {
      const handleClick = vi.fn()
      render(<Action onClick={handleClick}>Click</Action>)
      await userEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledOnce()
    })
  })

  describe('external links', () => {
    it('adds target and rel attributes when external is true', () => {
      render(
        <Action href="https://example.com" external>
          External
        </Action>,
      )
      const link = screen.getByRole('link', { name: 'External' })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('does not add target or rel when external is false', () => {
      render(<Action href="https://example.com">Internal</Action>)
      const link = screen.getByRole('link', { name: 'Internal' })
      expect(link).not.toHaveAttribute('target')
      expect(link).not.toHaveAttribute('rel')
    })
  })

  describe('disabled semantics', () => {
    it('real <button disabled> when disabled + onClick', () => {
      render(<Action disabled>Off</Action>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('renders a non-clickable, non-navigable <button> (not an <a>) when disabled + to', () => {
      renderWithRouter(
        <Action to="/foo" disabled>
          Off
        </Action>,
      )

      const el = screen.getByRole('button', { name: 'Off' })
      expect(el.tagName).toBe('BUTTON')
      expect(el).toBeDisabled()
      expect(el).toHaveAttribute('aria-disabled', 'true')
    })

    it('exposes an accessible name on a disabled `to` control via its role (icon-only / ambiguous-text links)', () => {
      renderWithRouter(
        <Action to="/foo" disabled aria-label="Delete plant">
          <span aria-hidden="true">🗑</span>
        </Action>,
      )

      // getByRole models how assistive tech computes the accessible name —
      // unlike a raw aria-label attribute check, this fails if the element's
      // role doesn't support naming (e.g. a bare <span role="generic">).
      expect(screen.getByRole('button', { name: 'Delete plant' })).toBeInTheDocument()
    })

    it('does not fire onClick when disabled + to (clicking the button)', async () => {
      const handleClick = vi.fn()
      renderWithRouter(
        <Action to="/foo" disabled onClick={handleClick}>
          Off
        </Action>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Off' }))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('exposes an accessible name on a disabled `href` control via its role (icon-only / ambiguous-text links)', () => {
      render(
        <Action href="https://example.com" disabled aria-label="External docs">
          <span aria-hidden="true">↗</span>
        </Action>,
      )

      expect(screen.getByRole('button', { name: 'External docs' })).toBeInTheDocument()
    })

    it('does not fire onClick when disabled + href (clicking the button)', async () => {
      const handleClick = vi.fn()
      render(
        <Action href="https://example.com" disabled onClick={handleClick}>
          Off
        </Action>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Off' }))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('onClick forwarding on link branches', () => {
    it('fires onClick when rendered with `to`', async () => {
      const handleClick = vi.fn()
      renderWithRouter(
        <Action to="/foo" onClick={handleClick}>
          Go
        </Action>,
      )

      await userEvent.click(screen.getByRole('link', { name: 'Go' }))
      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('fires onClick when rendered with `href`', async () => {
      // preventDefault avoids jsdom's "Not implemented: navigation" noise
      // for a real cross-document href; the assertion only cares that the
      // handler fires before navigation would occur.
      const handleClick = vi.fn((event) => event.preventDefault())
      render(
        <Action href="https://example.com" onClick={handleClick}>
          Docs
        </Action>,
      )

      await userEvent.click(screen.getByRole('link', { name: 'Docs' }))
      expect(handleClick).toHaveBeenCalledOnce()
    })
  })

  describe('styling', () => {
    it('applies variant classes by default', () => {
      render(<Action variant="primary">Hello</Action>)
      expect(screen.getByRole('button')).toHaveClass('rounded-md')
    })

    it('merges user-provided className with variant classes', () => {
      render(
        <Action variant="primary" className="extra-class" aria-label="Test">
          Save
        </Action>,
      )
      const button = screen.getByRole('button', { name: 'Test' })
      expect(button).toHaveClass('extra-class')
      expect(button.className).toContain('rounded-md')
    })

    it('variant="unstyled" skips variant classes but keeps the focus-visible ring', () => {
      render(
        <Action variant="unstyled" className="only-mine">
          Bare
        </Action>,
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('only-mine')
      expect(button.className).not.toContain('rounded-full')
      expect(button.className).not.toContain('bg-[image:')
      // Focus-visible ring is applied universally — unstyled consumers used
      // to duplicate it in their own className; now they inherit it.
      expect(button.className).toContain('focus-visible:ring')
    })

    it('variant="unstyled" skips the default disabled:opacity-60 so consumers can style "disabled" themselves', () => {
      render(
        <Action variant="unstyled" disabled>
          Bare
        </Action>,
      )
      const button = screen.getByRole('button')
      // Unstyled consumers (e.g. TaskRow's leaf-filled done state) define
      // their own disabled appearance; the default 60%-opacity grey would
      // fight them.
      expect(button.className).not.toContain('disabled:opacity-60')
    })
  })

  describe('passthrough props', () => {
    it('forwards arbitrary props (id, data-*, aria-label) via ...kwargs', () => {
      render(
        <Action id="my-action" data-testid="action-1" aria-label="Pressable">
          <span>+</span>
        </Action>,
      )
      const button = screen.getByTestId('action-1')
      expect(button).toHaveAttribute('id', 'my-action')
      expect(button).toHaveAttribute('aria-label', 'Pressable')
    })
  })
})
