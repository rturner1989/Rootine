import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../../src/api/client'
import { SearchProvider } from '../../../src/context/SearchContext'
import Encyclopedia from '../../../src/pages/encyclopedia/Encyclopedia'

vi.mock('../../../src/api/client', () => ({ apiGet: vi.fn() }))

function renderPage(entry = '/encyclopedia') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <SearchProvider>
          <Encyclopedia />
        </SearchProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Encyclopedia', () => {
  afterEach(() => vi.mocked(apiGet).mockReset())

  it('renders the species grid from the browse payload', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      species: [
        {
          id: 1,
          common_name: 'Monstera Deliciosa',
          scientific_name: 'Monstera deliciosa',
          pet_safe: false,
          difficulty: 'beginner',
        },
      ],
      facets: { pet_safe: 1, difficulty: { beginner: 1 }, light: { medium: 1 } },
    })

    renderPage()
    expect(await screen.findByText('Monstera Deliciosa')).toBeInTheDocument()
  })

  it('shows the filtered-empty state when the grid comes back empty', async () => {
    vi.mocked(apiGet).mockResolvedValue({ species: [], facets: { pet_safe: 0, difficulty: {}, light: {} } })

    renderPage()
    await waitFor(() => expect(screen.getByText(/no species match/i)).toBeInTheDocument())
  })

  it('renders grouped sections when view=spaces', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      groups: [
        {
          space: { id: 1, name: 'Living Room', icon: 'couch' },
          species: [{ id: 9, common_name: 'Snake Plant', pet_safe: false }],
        },
      ],
    })

    renderPage('/encyclopedia?view=spaces')
    expect(await screen.findByRole('heading', { name: /Living Room/i })).toBeInTheDocument()
  })
})
