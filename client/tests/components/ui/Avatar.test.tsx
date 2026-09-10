import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AvatarSize } from '../../../src/components/ui/Avatar'
import Avatar from '../../../src/components/ui/Avatar'

describe('Avatar', () => {
  describe('source selection', () => {
    it('renders the image when src is provided', () => {
      const { container } = render(<Avatar src="/plant.jpg" fallback={<span>F</span>} />)
      const img = container.querySelector('img')
      expect(img).not.toBeNull()
      expect(img).toHaveAttribute('src', '/plant.jpg')
      expect(container.textContent).toBe('')
    })

    it('renders the fallback when src is missing', () => {
      const { container } = render(<Avatar fallback={<span>F</span>} />)
      expect(container.querySelector('img')).toBeNull()
      expect(container.textContent).toBe('F')
    })

    it('flips to the fallback when the image fails to load', () => {
      const { container } = render(<Avatar src="/broken.jpg" fallback={<span>F</span>} />)
      const img = container.querySelector('img')
      expect(img).not.toBeNull()
      fireEvent.error(img!)
      expect(container.querySelector('img')).toBeNull()
      expect(container.textContent).toBe('F')
    })
  })

  describe('shape + sizing', () => {
    it('uses rounded-md by default (tile shape)', () => {
      const { container } = render(<Avatar fallback={<span>F</span>} />)
      expect(container.firstChild).toHaveClass('rounded-md')
    })

    it('switches to rounded-full when shape="circle"', () => {
      const { container } = render(<Avatar fallback={<span>F</span>} shape="circle" />)
      expect(container.firstChild).toHaveClass('rounded-full')
    })

    it.each<[AvatarSize, string]>([
      ['sm', 'w-[38px]'],
      ['md', 'w-12'],
      ['lg', 'w-[52px]'],
      ['xl', 'w-20'],
    ])('maps the %s size key to its width class (%s)', (size, widthClass) => {
      const { container } = render(<Avatar fallback={<span>F</span>} size={size} />)
      expect(container.firstChild).toHaveClass(widthClass)
    })
  })

  describe('passthrough', () => {
    it('forwards className and extra props to the root', () => {
      const { container } = render(
        <Avatar fallback={<span>F</span>} className="border-2 border-card" data-testid="user-avatar" />,
      )
      const el = container.firstChild
      expect(el).toHaveClass('border-2')
      expect(el).toHaveAttribute('data-testid', 'user-avatar')
    })
  })
})
