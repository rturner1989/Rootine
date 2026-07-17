import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NotificationsCard from '../../../src/components/me/NotificationsCard'

const PROFILE = { notify_care_reminders: true, notify_achievements: false }

describe('NotificationsCard', () => {
  it('renders a switch per preference, labelled by its row', () => {
    render(<NotificationsCard profile={PROFILE} onChange={() => {}} />)

    expect(screen.getByRole('switch', { name: 'Care reminders' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Achievements' })).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(2)
  })

  it('reflects each preference independently', () => {
    render(<NotificationsCard profile={PROFILE} onChange={() => {}} />)

    expect(screen.getByRole('switch', { name: 'Care reminders' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Achievements' })).toHaveAttribute('aria-checked', 'false')
  })

  it('reports the field, its new value, and a label for the confirmation', () => {
    const onChange = vi.fn()
    render(<NotificationsCard profile={PROFILE} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Care reminders' }))
    expect(onChange).toHaveBeenCalledWith('notify_care_reminders', false, 'Care reminders')

    fireEvent.click(screen.getByRole('switch', { name: 'Achievements' }))
    expect(onChange).toHaveBeenCalledWith('notify_achievements', true, 'Achievements')
  })

  // A missing profile must read as off, not crash — the page renders the
  // card before the query settles on a cold cache.
  it('treats an absent profile as opted out', () => {
    render(<NotificationsCard onChange={() => {}} />)
    for (const toggle of screen.getAllByRole('switch')) {
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    }
  })

  // Tabbing straight to a switch should announce what it does, not just
  // its title — the meta sits in adjacent text the switch can't see.
  it('describes each switch with its row meta', () => {
    render(<NotificationsCard profile={PROFILE} onChange={() => {}} />)

    const care = screen.getByRole('switch', { name: 'Care reminders' })
    const describedBy = care.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy)).toHaveTextContent('A daily nudge when a plant needs water or feeding')
  })

  it('disables every switch while saving', () => {
    render(<NotificationsCard profile={PROFILE} onChange={() => {}} disabled />)
    for (const toggle of screen.getAllByRole('switch')) {
      expect(toggle).toBeDisabled()
    }
  })
})
