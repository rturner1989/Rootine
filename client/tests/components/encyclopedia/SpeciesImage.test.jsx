import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SpeciesImage from '../../../src/components/encyclopedia/SpeciesImage'

describe('SpeciesImage', () => {
  it('renders the image when a url is given', () => {
    const { container } = render(<SpeciesImage imageUrl="https://example.com/fern.jpg" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/fern.jpg')
  })

  it('falls back to the emoji tile when there is no url', () => {
    const { container } = render(<SpeciesImage imageUrl={null} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('🌿')).toBeInTheDocument()
  })

  it('falls back to the emoji tile when the image fails to load', () => {
    const { container } = render(<SpeciesImage imageUrl="https://example.com/gone.jpg" />)
    fireEvent.error(container.querySelector('img'))
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('🌿')).toBeInTheDocument()
  })

  it('forwards className to size the box', () => {
    const { container } = render(
      <SpeciesImage imageUrl="https://example.com/fern.jpg" className="w-full aspect-[1.2]" />,
    )
    expect(container.querySelector('img').className).toContain('aspect-[1.2]')
  })
})
