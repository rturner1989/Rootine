import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TextInput from '../../../src/components/form/TextInput'

describe('TextInput', () => {
  describe('rendering', () => {
    it('renders the label text and an input', () => {
      render(<TextInput label="Email" type="email" />)
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('associates the label with the input via implicit wrapping', () => {
      render(<TextInput label="Email" type="email" />)
      const input = screen.getByLabelText('Email')
      expect(input).toBe(screen.getByRole('textbox'))
    })

    it('renders hint text when provided', () => {
      render(<TextInput label="Password" type="password" hint="At least 8 characters" />)
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    })

    it('does not render a hint element when hint is not provided', () => {
      const { container } = render(<TextInput label="Email" type="email" />)
      // Only one span — the label text — not two
      expect(container.querySelectorAll('span')).toHaveLength(1)
    })
  })

  describe('required asterisk', () => {
    it('renders no asterisk when the field is optional', () => {
      render(<TextInput label="Nickname" type="text" />)
      expect(screen.queryByText('*')).not.toBeInTheDocument()
    })

    it('appends a coral-deep "*" to the label when required', () => {
      render(<TextInput label="Email" type="email" required />)
      const asterisk = screen.getByText('*')
      expect(asterisk).toBeInTheDocument()
      expect(asterisk).toHaveClass('text-coral-deep')
    })

    it('marks the asterisk aria-hidden so screen readers announce via the native required attribute only', () => {
      render(<TextInput label="Email" type="email" required />)
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
    })

    it('still sets the required attribute on the underlying input', () => {
      render(<TextInput label="Email" type="email" required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })
  })

  describe('controlled value + onChange', () => {
    it('reflects the value prop on the underlying input', () => {
      render(<TextInput label="Email" type="email" value="rob@example.com" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveValue('rob@example.com')
    })

    it('fires onChange when the user types', async () => {
      const handleChange = vi.fn()
      render(<TextInput label="Email" type="email" value="" onChange={handleChange} />)
      await userEvent.type(screen.getByRole('textbox'), 'a')
      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('passthrough props', () => {
    it('forwards type / placeholder / required / minLength to the input', () => {
      render(<TextInput label="Password" type="password" placeholder="At least 8 characters" required minLength={8} />)
      // Regex match — required labels now include a visual asterisk that
      // an exact-string match would miss, even though it's aria-hidden.
      const input = screen.getByLabelText(/Password/)
      expect(input).toHaveAttribute('type', 'password')
      expect(input).toHaveAttribute('placeholder', 'At least 8 characters')
      expect(input).toBeRequired()
      expect(input).toHaveAttribute('minlength', '8')
    })

    it('forwards arbitrary props (id, data-*, autoComplete) via ...kwargs', () => {
      render(<TextInput label="Email" type="email" id="email-input" data-testid="email" autoComplete="email" />)
      const input = screen.getByTestId('email')
      expect(input).toHaveAttribute('id', 'email-input')
      expect(input).toHaveAttribute('autocomplete', 'email')
    })
  })

  describe('className', () => {
    it('merges user-provided className onto the wrapper div', () => {
      const { container } = render(<TextInput label="Email" type="email" className="mb-6" />)
      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('block')
      expect(wrapper).toHaveClass('mb-6')
    })
  })

  describe('error state', () => {
    it('renders the error message when error is a non-empty string', () => {
      render(<TextInput label="Email" type="email" error="has already been taken" />)
      expect(screen.getByText('has already been taken')).toBeInTheDocument()
    })

    it('marks the input as aria-invalid="true" when error is set', () => {
      render(<TextInput label="Email" type="email" error="has already been taken" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })

    it('points aria-describedby at the error message element', () => {
      render(<TextInput label="Email" type="email" error="has already been taken" />)
      const input = screen.getByRole('textbox')
      const describedById = input.getAttribute('aria-describedby')
      if (!describedById) throw new Error('expected aria-describedby to be set')
      const errorEl = document.getElementById(describedById)
      expect(errorEl).toHaveTextContent('has already been taken')
    })

    it('does not set aria-invalid when there is no error', () => {
      render(<TextInput label="Email" type="email" />)
      const input = screen.getByRole('textbox')
      expect(input).not.toHaveAttribute('aria-invalid')
      expect(input).not.toHaveAttribute('aria-describedby')
    })

    it('prefers the error message over the hint when both are set', () => {
      render(<TextInput label="Password" type="password" hint="At least 8 characters" error="is too short" />)
      expect(screen.getByText('is too short')).toBeInTheDocument()
      expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument()
    })

    it('falls back to showing the hint when error is cleared', () => {
      const { rerender } = render(
        <TextInput label="Password" type="password" hint="At least 8 characters" error="is too short" />,
      )
      expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument()

      rerender(<TextInput label="Password" type="password" hint="At least 8 characters" error={undefined} />)
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    })
  })
})
