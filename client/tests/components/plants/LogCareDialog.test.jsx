import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LogCareDialog from '../../../src/components/plants/LogCareDialog'
import { ToastProvider } from '../../../src/context/ToastContext'

const PLANT = {
  id: 7,
  nickname: 'Monty',
  species: { common_name: 'Monstera' },
}

let postedBody = null

function mockFetch(url, init) {
  if (url.includes(`/api/v1/plants/${PLANT.id}/care_logs`) && init?.method === 'POST') {
    postedBody = JSON.parse(init.body)
    // careLogSchema requires created_at too — the server stamps it, the
    // client never sends it, so the fixture adds it back onto the echo.
    return Response.json({ id: 1, created_at: '2026-05-01T00:00:00Z', ...postedBody.care_log })
  }
  return Response.json({})
}

function renderWithProviders(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('LogCareDialog', () => {
  beforeEach(() => {
    postedBody = null
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => mockFetch(String(url), init)),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders Water + Feed care-type options and defaults to Water', () => {
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={() => {}} />)
    const waterRadio = screen.getByRole('radio', { name: /Water/ })
    const feedRadio = screen.getByRole('radio', { name: /Feed/ })
    expect(waterRadio).toBeChecked()
    expect(feedRadio).not.toBeChecked()
  })

  it('honours the defaultCareType prop', () => {
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={() => {}} defaultCareType="feeding" />)
    expect(screen.getByRole('radio', { name: /Feed/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Water/ })).not.toBeChecked()
  })

  it('submits a POST with care_type, performed_at, and notes', async () => {
    const onClose = vi.fn()
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={onClose} />)

    fireEvent.click(screen.getByRole('radio', { name: /Feed/ }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'gave half-strength' } })
    fireEvent.click(screen.getByRole('button', { name: /^Log care$/ }))

    await waitFor(() => expect(postedBody).not.toBeNull())
    expect(postedBody.care_log.care_type).toBe('feeding')
    expect(postedBody.care_log.notes).toBe('gave half-strength')
    expect(typeof postedBody.care_log.performed_at).toBe('string')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('omits notes when textarea is empty', async () => {
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Log care$/ }))
    await waitFor(() => expect(postedBody).not.toBeNull())
    expect(postedBody.care_log.notes).toBeNull()
  })
})
