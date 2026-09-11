import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import RoomCard from '../../../../src/components/spaces/rooms/RoomCard'

const baseProps = {
  spaceId: 1,
  icon: '🛋️',
  name: 'Living Room',
  count: '3 plants · indoor',
}

function renderRoomCard(props = {}) {
  return render(
    <MemoryRouter>
      <RoomCard {...baseProps} {...props} />
    </MemoryRouter>,
  )
}

describe('RoomCard', () => {
  it('renders the icon, name, and count', () => {
    renderRoomCard()
    expect(screen.getByText('🛋️')).toBeInTheDocument()
    expect(screen.getByText('Living Room')).toBeInTheDocument()
    expect(screen.getByText('3 plants · indoor')).toBeInTheDocument()
  })

  it('renders the peek strip up to 3 plants and a +N more chip beyond', () => {
    const peek = [
      { id: 1, nickname: 'A', species: { common_name: 'A' }, urgent: false },
      { id: 2, nickname: 'B', species: { common_name: 'B' }, urgent: false },
      { id: 3, nickname: 'C', species: { common_name: 'C' }, urgent: false },
      { id: 4, nickname: 'D', species: { common_name: 'D' }, urgent: false },
      { id: 5, nickname: 'E', species: { common_name: 'E' }, urgent: false },
    ]
    renderRoomCard({ peek })
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('omits the +N more chip when peek length is at or below the limit', () => {
    const peek = [
      { id: 1, nickname: 'A', species: { common_name: 'A' } },
      { id: 2, nickname: 'B', species: { common_name: 'B' } },
      { id: 3, nickname: 'C', species: { common_name: 'C' } },
    ]
    renderRoomCard({ peek })
    expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument()
  })

  it('renders each visible peek avatar as a link to the plant detail page', () => {
    const peek = [
      { id: 11, nickname: 'Monty', species: { common_name: 'Monstera' }, urgent: false },
      { id: 22, nickname: 'Basil', species: { common_name: 'Basil' }, urgent: false },
    ]
    renderRoomCard({ peek })

    const montyLink = screen.getByRole('link', { name: 'View Monty' })
    expect(montyLink).toHaveAttribute('href', '/plants/11')

    const basilLink = screen.getByRole('link', { name: 'View Basil' })
    expect(basilLink).toHaveAttribute('href', '/plants/22')
  })

  it('renders the +N chip as a link to the space-filtered list view', () => {
    const peek = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      nickname: `P${index + 1}`,
      species: { common_name: `P${index + 1}` },
      urgent: false,
    }))
    renderRoomCard({ spaceId: 42, peek })

    const moreLink = screen.getByRole('link', { name: 'See all 5 plants in this space' })
    expect(moreLink).toHaveAttribute('href', '/house?view=list&space_id=42')
  })

  it('renders the next-care label as overdue (Fraunces italic) when overdue is true', () => {
    renderRoomCard({ nextCare: { icon: '💧', label: 'Monty · 3 days overdue', overdue: true } })
    const overdue = screen.getByText('Monty · 3 days overdue')
    expect(overdue.tagName.toLowerCase()).toBe('em')
  })

  it('renders the next-care label as plain text when not overdue', () => {
    renderRoomCard({ nextCare: { icon: '💧', label: 'Basil · in 5d', overdue: false } })
    const label = screen.getByText('Basil · in 5d')
    expect(label.tagName.toLowerCase()).not.toBe('em')
  })

  it('renders the env hint row when envHint is provided', () => {
    renderRoomCard({ envHint: 'Bright · average humidity' })
    expect(screen.getByText('Bright · average humidity')).toBeInTheDocument()
  })

  it('omits both summary rows when neither nextCare nor envHint is provided', () => {
    renderRoomCard()
    expect(screen.queryByText(/humidity/i)).not.toBeInTheDocument()
  })

  it('renders as display-only — no button role on the card itself', () => {
    renderRoomCard()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the weather pill instead of the env hint when weatherPill is provided', () => {
    renderRoomCard({
      envHint: 'Bright · average humidity',
      weatherPill: { icon: '🌧', label: 'Rain Sun · skip water', scheme: 'rain' },
    })
    expect(screen.getByText('Rain Sun · skip water')).toBeInTheDocument()
    expect(screen.queryByText('Bright · average humidity')).not.toBeInTheDocument()
  })
})
