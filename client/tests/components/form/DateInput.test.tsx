import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DateInput from '../../../src/components/form/DateInput'

describe('DateInput', () => {
  describe('rendering', () => {
    it('renders a native date input with the label', () => {
      render(<DateInput label="When did you last water?" />)
      const input = screen.getByLabelText('When did you last water?')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'date')
    })

    it('forwards value + onChange', () => {
      const onChange = vi.fn()
      render(<DateInput label="Watered" value="2026-05-08" onChange={onChange} />)
      const input = screen.getByLabelText('Watered')
      expect(input).toHaveValue('2026-05-08')
      fireEvent.change(input, { target: { value: '2026-05-07' } })
      expect(onChange).toHaveBeenCalledOnce()
    })

    it('hides the label visually when labelHidden is set', () => {
      render(<DateInput label="Watered" labelHidden />)
      expect(screen.getByText('Watered')).toHaveClass('sr-only')
    })

    it('renders hint text when provided and no error', () => {
      render(<DateInput label="Watered" hint="Default is today" />)
      expect(screen.getByText('Default is today')).toBeInTheDocument()
    })
  })

  describe('required asterisk', () => {
    it('appends a coral-deep "*" when required', () => {
      render(<DateInput label="Watered" required />)
      const asterisk = screen.getByText('*')
      expect(asterisk).toHaveClass('text-coral-deep')
      expect(asterisk).toHaveAttribute('aria-hidden', 'true')
    })

    it('passes required to the underlying input', () => {
      render(<DateInput label="Watered" required />)
      expect(screen.getByLabelText(/Watered/)).toBeRequired()
    })
  })

  describe('error state', () => {
    it('renders the error message when error is a non-empty string', () => {
      render(<DateInput label="Watered" error="Date cannot be in the future" />)
      expect(screen.getByText('Date cannot be in the future')).toBeInTheDocument()
    })

    it('marks the input aria-invalid when error is set', () => {
      const { container } = render(<DateInput label="Watered" error="Bad date" />)
      expect(container.querySelector('input[type="date"]')).toHaveAttribute('aria-invalid', 'true')
    })

    it('points aria-describedby at the error message', () => {
      const { container } = render(<DateInput label="Watered" error="Bad date" />)
      const input = container.querySelector('input[type="date"]')
      if (!input) throw new Error('expected a date input to be rendered')
      const describedBy = input.getAttribute('aria-describedby')
      if (!describedBy) throw new Error('expected aria-describedby to be set')
      expect(document.getElementById(describedBy)).toHaveTextContent('Bad date')
    })

    it('prefers the error message over the hint when both are set', () => {
      render(<DateInput label="Watered" hint="Default is today" error="Bad date" />)
      expect(screen.getByText('Bad date')).toBeInTheDocument()
      expect(screen.queryByText('Default is today')).toBeNull()
    })
  })

  describe('range bounds', () => {
    it('forwards min and max attributes to the input', () => {
      render(<DateInput label="Watered" min="2025-01-01" max="2026-12-31" />)
      const input = screen.getByLabelText('Watered')
      expect(input).toHaveAttribute('min', '2025-01-01')
      expect(input).toHaveAttribute('max', '2026-12-31')
    })
  })

  describe('kwargs forwarding', () => {
    it('passes arbitrary props (name, autoFocus, data-testid) through to the input', () => {
      render(<DateInput label="Watered" name="last_watered_at" data-testid="picker" autoFocus />)
      const input = screen.getByTestId('picker')
      expect(input).toHaveAttribute('name', 'last_watered_at')
      expect(document.activeElement).toBe(input)
    })
  })
})
