import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Action from '../../../../src/components/ui/Action'
import ErrorState from '../../../../src/components/ui/errors/ErrorState'

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ErrorState', () => {
  it('renders the 404 medallion by default', () => {
    renderWithRouter(<ErrorState />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders the "!" medallion when scheme="500"', () => {
    renderWithRouter(<ErrorState scheme="500" />)
    expect(screen.getByText('!')).toBeInTheDocument()
  })

  it('renders the title in an <h1> by default', () => {
    renderWithRouter(<ErrorState title="Something wobbled" />)
    expect(screen.getByRole('heading', { level: 1, name: /Something wobbled/ })).toBeInTheDocument()
  })

  it('accepts a ReactNode title (so callers can italicise a word with <em>)', () => {
    renderWithRouter(
      <ErrorState
        title={
          <>
            Not in your <em>greenhouse</em>
          </>
        }
      />,
    )
    expect(screen.getByRole('heading').querySelector('em')).toBeInTheDocument()
  })

  it('renders an array of actions', () => {
    renderWithRouter(
      <ErrorState
        actions={[
          <Action key="a" to="/">
            Back to Today
          </Action>,
          <Action key="b" to="/house">
            Open House
          </Action>,
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Back to Today' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open House' })).toBeInTheDocument()
  })

  it('focuses the first action on mount (a11y for keyboard recovery)', async () => {
    renderWithRouter(
      <ErrorState
        actions={[
          <Action key="primary" to="/">
            Back to Today
          </Action>,
        ]}
      />,
    )
    await waitFor(() => expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveFocus())
  })
})
