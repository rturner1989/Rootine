import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Avatar from '../../../src/components/plants/Avatar'

describe('Avatar', () => {
  describe('fallback', () => {
    it('renders the sprout fallback when no imageUrl is given', () => {
      const { container } = render(<Avatar />)
      expect(container.textContent).toBe('🌱')
    })

    it('renders the sprout fallback when imageUrl is null', () => {
      const { container } = render(<Avatar imageUrl={null} />)
      expect(container.textContent).toBe('🌱')
    })
  })

  describe('sizing', () => {
    it('defaults to the md size preset (48px via w-12 class)', () => {
      const { container } = render(<Avatar />)
      expect(container.firstChild).toHaveClass('w-12')
    })

    it('accepts a preset size and passes it through to Avatar', () => {
      const { container } = render(<Avatar size="xl" />)
      expect(container.firstChild).toHaveClass('w-20')
    })
  })

  describe('accessibility', () => {
    it('is aria-hidden because the adjacent plant name carries the label', () => {
      const { container } = render(<Avatar />)
      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('appearance', () => {
    it('uses the mint background and tile radius (rounded-md) by default', () => {
      const { container } = render(<Avatar />)
      const el = container.firstChild
      expect(el).toHaveClass('bg-mint')
      expect(el).toHaveClass('rounded-md')
    })

    it('switches to rounded-full when shape="circle"', () => {
      const { container } = render(<Avatar shape="circle" />)
      const el = container.firstChild
      expect(el).toHaveClass('rounded-full')
      expect(el).not.toHaveClass('rounded-md')
    })

    it('forwards className and extra props to the root', () => {
      const { container } = render(<Avatar className="border-2 border-card" data-testid="added-avatar" />)
      const el = container.firstChild
      expect(el).toHaveClass('border-2')
      expect(el).toHaveAttribute('data-testid', 'added-avatar')
    })
  })

  describe('image mode', () => {
    it('renders an <img> with object-cover when imageUrl is present', () => {
      const { container } = render(<Avatar imageUrl="/monty.jpg" />)
      const img = container.querySelector('img')
      expect(img).not.toBeNull()
      expect(img).toHaveAttribute('src', '/monty.jpg')
      expect(img).toHaveClass('object-cover')
    })

    it('falls back to the sprout emoji when no imageUrl', () => {
      const { container } = render(<Avatar imageUrl={null} />)
      expect(container.querySelector('img')).toBeNull()
      expect(container.textContent).toBe('🌱')
    })
  })
})
