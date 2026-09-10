import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SegmentedControl from '../../../src/components/form/SegmentedControl'

describe('SegmentedControl', () => {
  describe('rendering', () => {
    it('renders the label', () => {
      render(
        <SegmentedControl label="Light" value="medium" onChange={() => {}} options={['low', 'medium', 'bright']} />,
      )
      expect(screen.getByText('Light')).toBeInTheDocument()
    })

    it('renders one radio button per option', () => {
      render(
        <SegmentedControl label="Light" value="medium" onChange={() => {}} options={['low', 'medium', 'bright']} />,
      )
      expect(screen.getAllByRole('radio')).toHaveLength(3)
    })

    it('renders string options as their own label', () => {
      render(<SegmentedControl label="Light" value="medium" onChange={() => {}} options={['low', 'medium']} />)
      expect(screen.getByRole('radio', { name: 'low' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'medium' })).toBeInTheDocument()
    })

    it('renders {value, label} options with the label as the display text', () => {
      render(
        <SegmentedControl
          label="Humidity"
          value="dry"
          onChange={() => {}}
          options={[
            { value: 'dry', label: 'Dry air' },
            { value: 'humid', label: 'Humid air' },
          ]}
        />,
      )
      expect(screen.getByRole('radio', { name: 'Dry air' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Humid air' })).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('marks the matching option as checked', () => {
      render(
        <SegmentedControl label="Light" value="bright" onChange={() => {}} options={['low', 'medium', 'bright']} />,
      )
      expect(screen.getByRole('radio', { name: 'bright' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'low' })).not.toBeChecked()
    })

    it('calls onChange with the option value when a radio is clicked', async () => {
      const handleChange = vi.fn()
      render(
        <SegmentedControl label="Light" value="medium" onChange={handleChange} options={['low', 'medium', 'bright']} />,
      )
      await userEvent.click(screen.getByRole('radio', { name: 'bright' }))
      expect(handleChange).toHaveBeenCalledWith('bright')
    })

    it('passes the value (not the label) to onChange for object options', async () => {
      const handleChange = vi.fn()
      render(
        <SegmentedControl
          label="Humidity"
          value="dry"
          onChange={handleChange}
          options={[
            { value: 'dry', label: 'Dry air' },
            { value: 'humid', label: 'Humid air' },
          ]}
        />,
      )
      await userEvent.click(screen.getByRole('radio', { name: 'Humid air' }))
      expect(handleChange).toHaveBeenCalledWith('humid')
    })
  })

  describe('accessibility', () => {
    it('wraps the options in a radiogroup labelled by the label prop', () => {
      render(<SegmentedControl label="Light" value="low" onChange={() => {}} options={['low', 'high']} />)
      expect(screen.getByRole('radiogroup', { name: 'Light' })).toBeInTheDocument()
    })
  })

  describe('disabled options', () => {
    it('marks a disabled option as disabled on the native radio', () => {
      render(
        <SegmentedControl
          label="View"
          value="spaces"
          onChange={() => {}}
          options={[
            { value: 'spaces', label: 'Spaces' },
            { value: 'list', label: 'List' },
            { value: 'greenhouse', label: 'Greenhouse', disabled: true },
          ]}
        />,
      )
      expect(screen.getByRole('radio', { name: 'Greenhouse' })).toBeDisabled()
      expect(screen.getByRole('radio', { name: 'Spaces' })).not.toBeDisabled()
    })

    it('does not fire onChange when a disabled option is clicked', async () => {
      const handleChange = vi.fn()
      render(
        <SegmentedControl
          label="View"
          value="spaces"
          onChange={handleChange}
          options={[
            { value: 'spaces', label: 'Spaces' },
            { value: 'greenhouse', label: 'Greenhouse', disabled: true },
          ]}
        />,
      )
      await userEvent.click(screen.getByRole('radio', { name: 'Greenhouse' }))
      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('per-option icon and phase chip', () => {
    it('renders the per-option icon as a glyph', () => {
      render(
        <SegmentedControl
          label="View as"
          value="rooms"
          onChange={() => {}}
          options={[
            { value: 'rooms', label: 'Rooms', icon: '⊞' },
            { value: 'list', label: 'List', icon: '☰' },
          ]}
        />,
      )
      expect(screen.getByText('⊞')).toBeInTheDocument()
      expect(screen.getByText('☰')).toBeInTheDocument()
    })

    it('renders the phase chip when option.phase is provided', () => {
      render(
        <SegmentedControl
          label="View as"
          value="rooms"
          onChange={() => {}}
          options={[
            { value: 'rooms', label: 'Rooms' },
            { value: 'habitat', label: 'Habitat', disabled: true, phase: 'P3' },
          ]}
        />,
      )
      expect(screen.getByText('P3')).toBeInTheDocument()
    })
  })

  describe('label visibility', () => {
    it('renders the visible label by default', () => {
      render(<SegmentedControl label="Light" value="low" onChange={() => {}} options={['low', 'high']} />)
      expect(screen.getByText('Light')).toBeInTheDocument()
    })

    it('hides the visible label when labelHidden is true but keeps the radiogroup name', () => {
      render(
        <SegmentedControl label="View as" labelHidden value="rooms" onChange={() => {}} options={['rooms', 'list']} />,
      )
      expect(screen.queryByText('View as')).not.toBeInTheDocument()
      expect(screen.getByRole('radiogroup', { name: 'View as' })).toBeInTheDocument()
    })
  })
})
