import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SpeciesPicker from '../../../src/components/plants/SpeciesPicker'
import type { Species } from '../../../src/types/species'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

// speciesSchema requires the full Species#as_json field set.
function speciesFixture(overrides: Partial<Species> = {}): Species {
  return {
    id: 1,
    common_name: 'Species',
    scientific_name: null,
    watering_frequency_days: 7,
    feeding_frequency_days: null,
    light_requirement: null,
    humidity_preference: null,
    // BigDecimal columns render as strings ("15.0"), not numbers — see
    // Species#as_json. Real values here, not null, so this exercises
    // the z.string() branch rather than skipping it.
    temperature_min: '15.0',
    temperature_max: '25.0',
    toxicity: null,
    pet_safe: null,
    difficulty: null,
    growth_rate: null,
    personality: 'chill',
    popular: true,
    description: null,
    care_tips: null,
    image_url: null,
    suggested_light_level: 'medium',
    suggested_temperature_level: 'average',
    suggested_humidity_level: 'average',
    plant_levels: {
      light: ['low', 'medium', 'bright'],
      temperature: ['cool', 'average', 'warm'],
      humidity: ['dry', 'average', 'humid'],
    },
    ...overrides,
  }
}

describe('SpeciesPicker', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          speciesFixture({ id: 1, common_name: 'Snake Plant', scientific_name: 'Dracaena trifasciata' }),
          speciesFixture({ id: 2, common_name: 'Monstera', scientific_name: 'Monstera deliciosa' }),
        ]),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the search input', () => {
    render(<SpeciesPicker onPick={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByPlaceholderText('Search species…')).toBeInTheDocument()
  })

  it('renders popular species tiles after the popular query resolves', async () => {
    render(<SpeciesPicker onPick={vi.fn()} />, { wrapper: makeWrapper() })
    expect(await screen.findByRole('button', { name: /Snake Plant/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Monstera/ })).toBeInTheDocument()
  })

  it('fires onPick when a species tile is clicked', async () => {
    const onPick = vi.fn()
    render(<SpeciesPicker onPick={onPick} />, { wrapper: makeWrapper() })
    const snakePlant = await screen.findByRole('button', { name: /Snake Plant/ })
    fireEvent.click(snakePlant)
    expect(onPick).toHaveBeenCalledOnce()
    expect(onPick.mock.calls[0][0]).toMatchObject({ common_name: 'Snake Plant' })
  })

  it('honours actionLabel — "tap to pick" vs "tap to add"', async () => {
    const { unmount } = render(<SpeciesPicker onPick={vi.fn()} actionLabel="pick" />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText(/Popular · tap to pick/)).toBeInTheDocument())
    unmount()
    render(<SpeciesPicker onPick={vi.fn()} actionLabel="add" />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText(/Popular · tap to add/)).toBeInTheDocument())
  })

  it('autoFocus places focus on the search input on mount', () => {
    render(<SpeciesPicker onPick={vi.fn()} autoFocus />, { wrapper: makeWrapper() })
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Search species…'))
  })
})
