import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StepProgress from '../../../src/components/wizard/StepProgress'

describe('StepProgress', () => {
  it('renders one bar per step when skipSteps is empty', () => {
    const { container } = render(<StepProgress step={1} total={8} />)
    const bars = container.querySelectorAll('[role="presentation"] > div')
    expect(bars).toHaveLength(8)
  })

  it('hides skipped step segments from the bar', () => {
    const { container } = render(<StepProgress step={1} total={8} skipSteps={[5, 6]} />)
    const bars = container.querySelectorAll('[role="presentation"] > div')
    expect(bars).toHaveLength(6)
  })

  it('marks bars before the current step as done', () => {
    const { container } = render(<StepProgress step={3} total={5} />)
    const bars = container.querySelectorAll('[role="presentation"] > div')
    expect(bars[0]).toHaveClass('bg-emerald')
    expect(bars[1]).toHaveClass('bg-emerald')
  })

  it('marks the current step bar as active with a glow', () => {
    const { container } = render(<StepProgress step={3} total={5} />)
    const bars = container.querySelectorAll('[role="presentation"] > div')
    expect(bars[2]).toHaveClass('bg-emerald')
    expect(bars[2].className).toContain('shadow-[0_0_0_3px_rgba(20,144,47,0.2)]')
  })

  it('marks bars after the current step as pending', () => {
    const { container } = render(<StepProgress step={3} total={5} />)
    const bars = container.querySelectorAll('[role="presentation"] > div')
    expect(bars[3]).toHaveClass('bg-emerald/20')
    expect(bars[4]).toHaveClass('bg-emerald/20')
  })

  it('exposes the bar group as decorative (role="presentation")', () => {
    const { container } = render(<StepProgress step={1} total={3} />)
    expect(container.firstChild).toHaveAttribute('role', 'presentation')
  })
})
