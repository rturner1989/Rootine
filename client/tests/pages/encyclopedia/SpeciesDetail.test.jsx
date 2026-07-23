import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../../src/api/client'
import SpeciesDetail from '../../../src/pages/encyclopedia/SpeciesDetail'

vi.mock('../../../src/api/client', () => ({ apiGet: vi.fn() }))

function renderAt(id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/encyclopedia/species/${id}`]}>
        <Routes>
          <Route path="/encyclopedia/species/:id" element={<SpeciesDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SpeciesDetail', () => {
  afterEach(() => vi.mocked(apiGet).mockReset())

  it('renders reference data and the community block', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      id: 5,
      common_name: 'Snake Plant',
      scientific_name: 'Dracaena trifasciata',
      difficulty: 'beginner',
      pet_safe: false,
      community: { grower_count: 12, median_watering_days: 16, typical_light: 'low', kept_on_schedule_pct: 88 },
    })

    renderAt(5)
    // common_name appears in both the page h1 and SpeciesView's h2 — assert
    // the h1 specifically rather than a bare text match.
    expect(await screen.findByRole('heading', { level: 1, name: 'Snake Plant' })).toBeInTheDocument()
    expect(screen.getByText(/how people grow this/i)).toBeInTheDocument()
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })

  it('shows the below-floor note when community is null', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      id: 6,
      common_name: 'Rare Fern',
      scientific_name: 'Rara filix',
      difficulty: 'advanced',
      pet_safe: null,
      community: null,
    })

    renderAt(6)
    expect(await screen.findByRole('heading', { level: 1, name: 'Rare Fern' })).toBeInTheDocument()
    expect(screen.getByText(/not enough growers yet/i)).toBeInTheDocument()
  })
})
