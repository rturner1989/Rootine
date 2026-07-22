# Encyclopedia Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the last placeholder route with a real Encyclopedia — a community-ranked, filterable species browser plus a standalone species page carrying reference data and community aggregates.

**Architecture:** `/encyclopedia` is the browse grid; `/encyclopedia/species/:id` is the species page. Search reuses the existing `useRegisterSearchScope` chrome; filtering reuses the `FilterControl` extracted in ticket 1 (Encyclopedia supplies its own schema, fields, and chip row); reference display reuses `SpeciesView`. New: a `useEncyclopediaBrowse` hook against `?browse=1`, a `SpeciesCard` grid cell, and a `CommunityStats` block.

**Tech Stack:** React 19, Vite, TanStack Query, React Router, Tailwind v4, Framer Motion, Vitest + RTL, Playwright.

## Global Constraints

- Backend is on the base branch (`feat-species-browse-backend`, PR #89). This branch stacks on it. `?browse=1` → `{ species: [...], facets: {...} }`; `GET /species/:id` → species with a `community` block (or `community: null` below the 5-grower floor); bare `/species` → popular (unchanged).
- Server owns business calculations — read server fields (`pet_safe`, `community.median_watering_days`, etc.), never recompute. Pure presentation formatting is fine and lives in `client/src/utils/`.
- Reuse before building: `PageHeader`, `Card`, `Badge`, `Avatar`, `EmptyState`, `Spinner`, `Breadcrumb`, `SpeciesView`, `FilterControl`, `FilterChips`, `useRegisterSearchScope`, the `filterSchema` helpers.
- Tests in `client/tests/` mirroring `client/src/`. `.test.jsx` = Vitest, `.spec.js` = Playwright. Never cross.
- `...kwargs` not `...rest`. No single-letter / placeholder names. No chained ternaries in JSX — extract a `renderX()` helper. Icon-only buttons use `ActionIcon`. Glyphs size to `w-2.5 / w-3 / w-4 / w-5`.
- Decorative CSS → a `@utility` in `globals.css`, not inline `style`. Reuse `eyebrow-label`, `text-gradient-display`.
- Chrome/nav/button icons → Font Awesome. Identity/illustration → emoji. Species avatars are emoji (matches `plants/Avatar`).
- Cache keys: client tuples flat, resource first — `['species', 'browse', filters]`.
- Run from `client/`: `cd /Users/rob/Development/PlantCare/client`. Lint with `../scripts/lint.sh` as the final step.

---

## File Structure

**Create:**
- `client/src/pages/Encyclopedia.jsx` — browse: header, search, filter, grid
- `client/src/pages/SpeciesDetail.jsx` — `/encyclopedia/species/:id`
- `client/src/hooks/useEncyclopedia.js` — `useEncyclopediaBrowse(filters)`
- `client/src/components/encyclopedia/SpeciesCard.jsx` — grid cell
- `client/src/components/encyclopedia/CommunityStats.jsx` — aggregates block
- `client/src/components/encyclopedia/EncyclopediaFilter.jsx` — wires `FilterControl` to Encyclopedia's schema
- `client/src/components/encyclopedia/filter/config.js` — schema + labels + URL read
- `client/src/components/encyclopedia/filter/Fields.jsx` — pet-safe / difficulty / light controls
- `client/src/components/encyclopedia/filter/ActiveChips.jsx` — active-filter chips
- `client/src/utils/petSafety.js` — tri-state label helper
- Tests mirroring each of the above under `client/tests/`

**Modify:**
- `client/src/api/queryKeys.js` — add `species.browse(filters)`
- `client/src/App.jsx` — real `/encyclopedia` + nested species route (drop the placeholder)

---

### Task 1: Query key + browse hook

**Files:**
- Modify: `client/src/api/queryKeys.js`
- Create: `client/src/hooks/useEncyclopedia.js`
- Test: `client/tests/hooks/useEncyclopedia.test.jsx`

**Interfaces:**
- Produces: `queryKeys.species.browse(filters)` → `['species', 'browse', filters]`; `useEncyclopediaBrowse(filters)` → TanStack query returning `{ species, facets }`.

- [ ] **Step 1: Write the failing test**

Create `client/tests/hooks/useEncyclopedia.test.jsx`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../src/api/client'
import { useEncyclopediaBrowse } from '../../src/hooks/useEncyclopedia'

vi.mock('../../src/api/client', () => ({ apiGet: vi.fn() }))

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useEncyclopediaBrowse', () => {
  afterEach(() => vi.mocked(apiGet).mockReset())

  it('requests browse mode with no filters', async () => {
    vi.mocked(apiGet).mockResolvedValue({ species: [], facets: {} })
    const { result } = renderHook(() => useEncyclopediaBrowse({}), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith('/api/v1/species?browse=1')
  })

  it('serialises active filters into the query string', async () => {
    vi.mocked(apiGet).mockResolvedValue({ species: [], facets: {} })
    const { result } = renderHook(
      () => useEncyclopediaBrowse({ petSafe: true, difficulty: 'beginner', light: 'bright' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(apiGet).mock.calls[0][0]
    expect(url).toContain('browse=1')
    expect(url).toContain('pet_safe=true')
    expect(url).toContain('difficulty=beginner')
    expect(url).toContain('light=bright')
  })

  it('omits filters that are not set', async () => {
    vi.mocked(apiGet).mockResolvedValue({ species: [], facets: {} })
    const { result } = renderHook(() => useEncyclopediaBrowse({ petSafe: false, difficulty: null, light: null }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(apiGet).mock.calls[0][0]
    expect(url).not.toContain('pet_safe')
    expect(url).not.toContain('difficulty')
    expect(url).not.toContain('light')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/hooks/useEncyclopedia.test.jsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Add the query key**

In `client/src/api/queryKeys.js`, extend the `species` block:

```js
  species: {
    popular: ['species', 'popular'],
    search: (query) => ['species', 'search', query],
    browse: (filters) => ['species', 'browse', filters],
    detail: (id) => ['species', id],
  },
```

- [ ] **Step 4: Implement the hook**

Create `client/src/hooks/useEncyclopedia.js`:

```js
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/queryKeys'

// pet_safe is only sent when explicitly true — the browse endpoint treats a
// missing flag as "no filter", and false would read as "show me toxic ones",
// which isn't a thing the UI offers.
function browseQuery(filters) {
  const params = new URLSearchParams({ browse: '1' })
  if (filters.petSafe) params.set('pet_safe', 'true')
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.light) params.set('light', filters.light)
  return params.toString()
}

export function useEncyclopediaBrowse(filters) {
  return useQuery({
    queryKey: queryKeys.species.browse(filters),
    queryFn: () => apiGet(`/api/v1/species?${browseQuery(filters)}`),
    staleTime: 1000 * 60 * 5,
  })
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/hooks/useEncyclopedia.test.jsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/api/queryKeys.js client/src/hooks/useEncyclopedia.js client/tests/hooks/useEncyclopedia.test.jsx
git commit -m "feat(v2): encyclopedia browse query hook"
```

---

### Task 2: Pet-safety label helper

**Files:**
- Create: `client/src/utils/petSafety.js`
- Test: `client/tests/utils/petSafety.test.js`

**Interfaces:**
- Produces: `petSafetyLabel(petSafe)` → `{ text, tone }` for the tri-state (`true` → safe/mint, `false` → toxic/coral, `null|undefined` → unknown/neutral). `tone` is one of `'safe' | 'toxic' | 'unknown'`.

- [ ] **Step 1: Write the failing test**

Create `client/tests/utils/petSafety.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { petSafetyLabel } from '../../src/utils/petSafety'

describe('petSafetyLabel', () => {
  it('true → pet-safe', () => {
    expect(petSafetyLabel(true)).toEqual({ text: 'Pet-safe', tone: 'safe' })
  })

  it('false → toxic to pets', () => {
    expect(petSafetyLabel(false)).toEqual({ text: 'Toxic to pets', tone: 'toxic' })
  })

  it('null → unknown, never a safety claim', () => {
    expect(petSafetyLabel(null)).toEqual({ text: 'Pet safety unknown', tone: 'unknown' })
  })

  it('undefined is treated as unknown too', () => {
    expect(petSafetyLabel(undefined).tone).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/utils/petSafety.test.js`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Implement**

Create `client/src/utils/petSafety.js`:

```js
// The server ships pet_safe as a tri-state: true (known safe), false (known
// toxic), null (unknown). Unknown must never render as a safety claim — it
// gets its own neutral treatment, not a green "safe".
export function petSafetyLabel(petSafe) {
  if (petSafe === true) return { text: 'Pet-safe', tone: 'safe' }
  if (petSafe === false) return { text: 'Toxic to pets', tone: 'toxic' }
  return { text: 'Pet safety unknown', tone: 'unknown' }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/utils/petSafety.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/utils/petSafety.js client/tests/utils/petSafety.test.js
git commit -m "feat(v2): pet-safety tri-state label helper"
```

---

### Task 3: Encyclopedia filter config, fields, chips

Mirror the journal filter folder shape (`filter/config.js`, `filter/Fields.jsx`, `filter/ActiveChips.jsx`) but with Encyclopedia's axes: `petSafe` (bool), `difficulty` (multi), `light` (multi).

**Files:**
- Create: `client/src/components/encyclopedia/filter/config.js`
- Create: `client/src/components/encyclopedia/filter/Fields.jsx`
- Create: `client/src/components/encyclopedia/filter/ActiveChips.jsx`
- Create: `client/src/components/encyclopedia/EncyclopediaFilter.jsx`
- Test: `client/tests/components/encyclopedia/filter/config.test.js`

**Interfaces:**
- Consumes: `filterSchema` helpers, `FilterControl`, `FilterChips`, `useFilterDraft`.
- Produces:
  - `ENCYCLOPEDIA_FILTER_SCHEMA` — `[petSafe:bool, difficulty:multi, light:multi]`.
  - `readEncyclopediaFilters(searchParams)` / `applyEncyclopediaFilters(setSearchParams, draft)` — thin `readFilters`/`writeFilters` delegates.
  - `<EncyclopediaFilter facets={...} />` — drops a fully wired `FilterControl` (with its ActiveChips row) onto the page.

- [ ] **Step 1: Write the failing config test**

Create `client/tests/components/encyclopedia/filter/config.test.js`:

```js
import { describe, expect, it, vi } from 'vitest'
import {
  applyEncyclopediaFilters,
  DIFFICULTY_OPTIONS,
  LIGHT_OPTIONS,
  readEncyclopediaFilters,
} from '../../../../src/components/encyclopedia/filter/config'

describe('readEncyclopediaFilters', () => {
  it('reads pet_safe, difficulty, light from the query string', () => {
    const params = new URLSearchParams('pet_safe=true&difficulty=beginner,intermediate&light=bright')
    expect(readEncyclopediaFilters(params)).toEqual({
      petSafe: true,
      difficulty: ['beginner', 'intermediate'],
      light: ['bright'],
    })
  })

  it('empties to the neutral draft when nothing is set', () => {
    expect(readEncyclopediaFilters(new URLSearchParams())).toEqual({
      petSafe: null,
      difficulty: [],
      light: [],
    })
  })

  it('drops difficulty values outside the known set', () => {
    const params = new URLSearchParams('difficulty=beginner,wizard')
    expect(readEncyclopediaFilters(params).difficulty).toEqual(['beginner'])
  })
})

describe('applyEncyclopediaFilters', () => {
  it('writes populated axes and deletes empty ones', () => {
    const setSearchParams = vi.fn()
    applyEncyclopediaFilters(setSearchParams, { petSafe: true, difficulty: ['beginner'], light: [] })
    const [updater] = setSearchParams.mock.calls[0]
    const params = updater(new URLSearchParams('light=bright'))
    expect(params.get('pet_safe')).toBe('true')
    expect(params.get('difficulty')).toBe('beginner')
    expect(params.get('light')).toBeNull()
  })
})

describe('option lists', () => {
  it('exposes the three difficulty levels and three light levels', () => {
    expect(DIFFICULTY_OPTIONS.map((option) => option.value)).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(LIGHT_OPTIONS.map((option) => option.value)).toEqual(['low', 'medium', 'bright'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/encyclopedia/filter/config.test.js`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Implement the config**

Create `client/src/components/encyclopedia/filter/config.js`:

```js
import { emptyDraft, readFilters, writeFilters } from '../../../utils/filterSchema'

export const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🌿' },
  { value: 'advanced', label: 'Advanced', emoji: '🌳' },
]

// Matches Space's light vocabulary — the browse endpoint filters on the
// species' derived suggested_light_level, which uses these same keys.
export const LIGHT_OPTIONS = [
  { value: 'low', label: 'Low light', emoji: '🌑' },
  { value: 'medium', label: 'Medium light', emoji: '⛅' },
  { value: 'bright', label: 'Bright light', emoji: '☀️' },
]

const DIFFICULTY_VALUES = DIFFICULTY_OPTIONS.map((option) => option.value)
const LIGHT_VALUES = LIGHT_OPTIONS.map((option) => option.value)

export const ENCYCLOPEDIA_FILTER_SCHEMA = [
  { id: 'petSafe', param: 'pet_safe', type: 'bool' },
  { id: 'difficulty', param: 'difficulty', type: 'multi', isValid: (value) => DIFFICULTY_VALUES.includes(value) },
  { id: 'light', param: 'light', type: 'multi', isValid: (value) => LIGHT_VALUES.includes(value) },
]

export const EMPTY_DRAFT = emptyDraft(ENCYCLOPEDIA_FILTER_SCHEMA)

export function readEncyclopediaFilters(searchParams) {
  return readFilters(searchParams, ENCYCLOPEDIA_FILTER_SCHEMA)
}

export function applyEncyclopediaFilters(setSearchParams, next) {
  setSearchParams((prev) => writeFilters(prev, next, ENCYCLOPEDIA_FILTER_SCHEMA), { replace: false })
}
```

- [ ] **Step 4: Run to verify config passes**

Run: `npx vitest run tests/components/encyclopedia/filter/config.test.js`
Expected: PASS.

Note: the browse schema uses `difficulty` as multi (checkbox-style), while the backend `Species.browse` currently takes a single `difficulty:` string. **This is the first place the stacked backend branch needs a change** — see Task 3 Step 5.

- [ ] **Step 5: Reconcile difficulty multi-select with the backend**

The frontend offers difficulty as a multi-select (all three are independent chips). The backend `Species.browse(difficulty:)` accepts one value. Rather than cripple the UI to single-select, widen the backend to accept a list — do this on the base branch so it flows into both the backend PR and here.

On `feat-species-browse-backend`'s `Species.browse`, change the difficulty clause to accept an array:

```ruby
    scope = scope.where(difficulty: Array(difficulty)) if difficulty.present?
```

and the controller `browse_filters` to split the param:

```ruby
          difficulty: params[:difficulty].presence&.split(','),
```

Add a backend test to `species_browse_test.rb` (on the base branch): `Species.browse(difficulty: %w[beginner advanced])` returns both levels and excludes intermediate. Run the API suite, commit on the base branch, then rebase this branch (or cherry-pick) so the change is present. Record in the PR that the base branch gained this commit.

(If you prefer to keep the branches clean, the alternative is single-select difficulty on the frontend — but multi matches the mockup's chip row and the light axis, so widening the backend is the honest fix.)

- [ ] **Step 6: Implement Fields**

Create `client/src/components/encyclopedia/filter/Fields.jsx`:

```jsx
import { memo } from 'react'
import Action from '../../ui/Action'
import Heading from '../../ui/Heading'
import { DIFFICULTY_OPTIONS, LIGHT_OPTIONS } from './config'

const CHIP_BASE = 'rounded-full text-[11px] font-bold transition-colors inline-flex items-center gap-1 px-2.5 py-1'
const CHIP_SELECTED = 'bg-emerald text-paper'
const CHIP_IDLE = 'bg-paper-deep text-ink-soft hover:bg-paper-edge'

// The three Encyclopedia filter sections — Pet safety (single toggle),
// Difficulty and Light (multi chips) — shared by the popover and dialog
// panels via FilterControl's renderFields slot.
const Fields = memo(function Fields({ draft, toggleValue, setValue }) {
  return (
    <>
      <Heading as="h5" variant="eyebrow" className="text-ink-softer mb-2">
        Pet safety
      </Heading>
      <Action
        variant="unstyled"
        type="button"
        role="switch"
        aria-checked={draft.petSafe === true}
        onClick={() => setValue('petSafe', draft.petSafe === true ? null : true)}
        className={`${CHIP_BASE} ${draft.petSafe === true ? CHIP_SELECTED : CHIP_IDLE}`}
      >
        <span aria-hidden="true">🐾</span>
        Pet-safe only
      </Action>

      <Heading as="h5" variant="eyebrow" className="text-ink-softer mb-2 mt-4">
        Difficulty
      </Heading>
      <div className="flex flex-wrap gap-1">
        {DIFFICULTY_OPTIONS.map((option) => renderChip('difficulty', option, draft, toggleValue))}
      </div>

      <Heading as="h5" variant="eyebrow" className="text-ink-softer mb-2 mt-4">
        Light
      </Heading>
      <div className="flex flex-wrap gap-1">
        {LIGHT_OPTIONS.map((option) => renderChip('light', option, draft, toggleValue))}
      </div>
    </>
  )
})

function renderChip(axisId, option, draft, toggleValue) {
  const selected = draft[axisId].includes(option.value)
  return (
    <Action
      key={option.value}
      variant="unstyled"
      type="button"
      onClick={() => toggleValue(axisId, option.value)}
      aria-pressed={selected}
      className={`${CHIP_BASE} ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
    >
      <span aria-hidden="true">{option.emoji}</span>
      {option.label}
    </Action>
  )
}

export default Fields
```

- [ ] **Step 7: Implement ActiveChips**

Create `client/src/components/encyclopedia/filter/ActiveChips.jsx`:

```jsx
import { useSearchParams } from 'react-router-dom'
import FilterChips from '../../ui/FilterChips'
import { applyEncyclopediaFilters, DIFFICULTY_OPTIONS, EMPTY_DRAFT, LIGHT_OPTIONS, readEncyclopediaFilters } from './config'

const DIFFICULTY_LABEL = Object.fromEntries(DIFFICULTY_OPTIONS.map((option) => [option.value, option.label]))
const LIGHT_LABEL = Object.fromEntries(LIGHT_OPTIONS.map((option) => [option.value, option.label]))

// Active-filter chips for the browse grid, built as descriptors and handed
// to the shared FilterChips. Reads its own URL state so it can sit under the
// filter pill without prop-drilling.
export default function ActiveChips() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEncyclopediaFilters(searchParams)

  function clearAxis(patch) {
    applyEncyclopediaFilters(setSearchParams, { ...filters, ...patch })
  }

  const chips = []
  if (filters.petSafe) {
    chips.push({ key: 'pet', label: 'Pet-safe', clearLabel: 'Clear pet-safe filter', onClear: () => clearAxis({ petSafe: null }) })
  }
  for (const value of filters.difficulty) {
    chips.push({
      key: `difficulty-${value}`,
      label: DIFFICULTY_LABEL[value],
      clearLabel: `Remove ${DIFFICULTY_LABEL[value]} filter`,
      onClear: () => clearAxis({ difficulty: filters.difficulty.filter((entry) => entry !== value) }),
    })
  }
  for (const value of filters.light) {
    chips.push({
      key: `light-${value}`,
      label: LIGHT_LABEL[value],
      clearLabel: `Remove ${LIGHT_LABEL[value]} filter`,
      onClear: () => clearAxis({ light: filters.light.filter((entry) => entry !== value) }),
    })
  }

  return <FilterChips chips={chips} onClearAll={() => applyEncyclopediaFilters(setSearchParams, EMPTY_DRAFT)} />
}
```

- [ ] **Step 8: Implement EncyclopediaFilter**

Create `client/src/components/encyclopedia/EncyclopediaFilter.jsx`:

```jsx
import { useSearchParams } from 'react-router-dom'
import FilterControl from '../ui/FilterControl'
import ActiveChips from './filter/ActiveChips'
import { applyEncyclopediaFilters, ENCYCLOPEDIA_FILTER_SCHEMA, readEncyclopediaFilters } from './filter/config'
import Fields from './filter/Fields'

// Drops a fully wired filter control onto the browse page: Encyclopedia's
// schema + fields + chip row on the shared FilterControl chrome.
export default function EncyclopediaFilter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEncyclopediaFilters(searchParams)

  return (
    <FilterControl
      schema={ENCYCLOPEDIA_FILTER_SCHEMA}
      filters={filters}
      title="Filter species"
      onApply={(draft) => applyEncyclopediaFilters(setSearchParams, draft)}
      renderFields={(form) => <Fields {...form} />}
    >
      <ActiveChips />
    </FilterControl>
  )
}
```

- [ ] **Step 9: Run the config test + full unit suite**

Run: `npx vitest run tests/components/encyclopedia/filter/config.test.js && npx vitest run`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/components/encyclopedia/filter client/src/components/encyclopedia/EncyclopediaFilter.jsx client/tests/components/encyclopedia/filter/config.test.js
git commit -m "feat(v2): encyclopedia filter schema, fields, chips"
```

---

### Task 4: SpeciesCard grid cell

**Files:**
- Create: `client/src/components/encyclopedia/SpeciesCard.jsx`
- Test: `client/tests/components/encyclopedia/SpeciesCard.test.jsx`
- Modify: `client/src/globals.css` — `@utility species-photo` for the gradient tile

**Interfaces:**
- Consumes: `petSafetyLabel`, `Card`, `Badge`, React Router `Link`.
- Produces: `<SpeciesCard species={...} />` linking to `/encyclopedia/species/:id`, mirroring mockup 25's `.sp-card` (photo/name/scientific/traits).

- [ ] **Step 1: Write the failing test**

Create `client/tests/components/encyclopedia/SpeciesCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpeciesCard from '../../../src/components/encyclopedia/SpeciesCard'

function renderCard(species) {
  return render(
    <MemoryRouter>
      <SpeciesCard species={species} />
    </MemoryRouter>,
  )
}

describe('SpeciesCard', () => {
  const base = { id: 7, common_name: 'Monstera Deliciosa', scientific_name: 'Monstera deliciosa', difficulty: 'beginner', pet_safe: false }

  it('renders common and scientific name', () => {
    renderCard(base)
    expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument()
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument()
  })

  it('links to the species detail route', () => {
    renderCard(base)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/encyclopedia/species/7')
  })

  it('shows the pet-safety trait from the server tri-state', () => {
    renderCard({ ...base, pet_safe: true })
    expect(screen.getByText('Pet-safe')).toBeInTheDocument()
  })

  it('does not claim safety when pet_safe is unknown', () => {
    renderCard({ ...base, pet_safe: null })
    expect(screen.queryByText('Pet-safe')).not.toBeInTheDocument()
    expect(screen.getByText('Pet safety unknown')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/encyclopedia/SpeciesCard.test.jsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Add the photo utility**

In `client/src/globals.css`, near the other `@utility` blocks, add:

```css
@utility species-photo {
  background: linear-gradient(135deg, #a8d9aa, #77b97a);
  aspect-ratio: 1.2;
}
```

- [ ] **Step 4: Implement**

Create `client/src/components/encyclopedia/SpeciesCard.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { petSafetyLabel } from '../../utils/petSafety'
import Badge from '../ui/Badge'
import Card from '../ui/Card'

const TONE_SCHEME = { safe: 'emerald', toxic: 'coral', unknown: 'neutral' }

function capitalise(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// Browse grid cell (mockup 25 .sp-card): emoji photo tile, italic common
// name, scientific name, trait badges. The whole card is the link into the
// species page. Card is a plain div (not polymorphic), so the Link wraps it
// — the outer Link is the single role="link".
export default function SpeciesCard({ species }) {
  const safety = petSafetyLabel(species.pet_safe)

  return (
    <Link to={`/encyclopedia/species/${species.id}`} className="block focus-visible:outline-none">
      <Card
        variant="paper-warm"
        className="p-3.5 gap-2.5 hover:-translate-y-px hover:shadow-warm-md transition-all"
      >
        <span aria-hidden="true" className="species-photo w-full rounded-[10px] flex items-center justify-center text-[54px]">
          🌿
        </span>
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="font-display italic text-[17px] leading-tight text-ink">{species.common_name}</span>
          {species.scientific_name && (
            <span className="text-[11px] italic text-ink-softer truncate">{species.scientific_name}</span>
          )}
        </span>
        <span className="flex flex-wrap gap-1 mt-1">
          {species.difficulty && (
            <Badge scheme="neutral" size="sm">
              {capitalise(species.difficulty)}
            </Badge>
          )}
          <Badge scheme={TONE_SCHEME[safety.tone]} size="sm">
            {safety.text}
          </Badge>
        </span>
      </Card>
    </Link>
  )
}
```

Confirm `Badge`'s available `scheme` values (`components/ui/Badge.jsx`) include `emerald`/`coral`/`neutral`; if the names differ, map `TONE_SCHEME` to whatever Badge actually offers. A focus-visible ring on the Link is required for keyboard users — add the project's ring utility if `focus-visible:outline-none` alone removes it without a replacement.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/components/encyclopedia/SpeciesCard.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/components/encyclopedia/SpeciesCard.jsx client/src/globals.css client/tests/components/encyclopedia/SpeciesCard.test.jsx
git commit -m "feat(v2): species grid card"
```

---

### Task 5: CommunityStats block

**Files:**
- Create: `client/src/components/encyclopedia/CommunityStats.jsx`
- Test: `client/tests/components/encyclopedia/CommunityStats.test.jsx`

**Interfaces:**
- Consumes: the server `community` object (`{ grower_count, median_watering_days, typical_light, kept_on_schedule_pct }`) or `null`.
- Produces: `<CommunityStats community={...} />` — renders the four stats, or a "not enough growers yet" note when `community` is null. Never recomputes anything.

- [ ] **Step 1: Write the failing test**

Create `client/tests/components/encyclopedia/CommunityStats.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CommunityStats from '../../../src/components/encyclopedia/CommunityStats'

describe('CommunityStats', () => {
  it('renders the four server-computed stats', () => {
    render(
      <CommunityStats community={{ grower_count: 38, median_watering_days: 9, typical_light: 'medium', kept_on_schedule_pct: 72 }} />,
    )
    expect(screen.getByText(/38/)).toBeInTheDocument()
    expect(screen.getByText(/9/)).toBeInTheDocument()
    expect(screen.getByText(/72%/)).toBeInTheDocument()
    expect(screen.getByText(/medium/i)).toBeInTheDocument()
  })

  it('shows a below-the-floor note when there is no community data', () => {
    render(<CommunityStats community={null} />)
    expect(screen.getByText(/not enough growers yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/encyclopedia/CommunityStats.test.jsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Implement**

Create `client/src/components/encyclopedia/CommunityStats.jsx`:

```jsx
import Card from '../ui/Card'
import Heading from '../ui/Heading'

// Anonymous, server-computed facts about how people here actually grow this
// species. Everything is read straight from the `community` payload — the
// client never recomputes an interval or a percentage. Absent below the
// server's grower-privacy floor.
export default function CommunityStats({ community }) {
  if (!community) {
    return (
      <Card variant="paper-warm" className="p-5">
        <p className="text-sm text-ink-soft italic">
          Not enough growers yet — community stats appear once a few more people are growing this.
        </p>
      </Card>
    )
  }

  const stats = [
    { label: 'Growers here', value: community.grower_count },
    { label: 'Typically watered', value: `every ${community.median_watering_days} days` },
    { label: 'Usual light', value: community.typical_light },
    { label: 'Kept on schedule', value: `${community.kept_on_schedule_pct}%` },
  ]

  return (
    <Card variant="paper-warm" className="p-5 gap-3">
      <Card.Header divider={false}>
        <Heading as="h2" variant="panel" className="text-ink !text-[18px]">
          How people grow this
        </Heading>
      </Card.Header>
      <Card.Body className="!flex-none !overflow-visible">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-paper-deep/40">
              <dt className="eyebrow-label text-ink-softer">{stat.label}</dt>
              <dd className="text-sm font-bold text-ink">{stat.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Card.Body>
    </Card>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/encyclopedia/CommunityStats.test.jsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/components/encyclopedia/CommunityStats.jsx client/tests/components/encyclopedia/CommunityStats.test.jsx
git commit -m "feat(v2): community stats block"
```

---

### Task 6: The Encyclopedia browse page

**Files:**
- Create: `client/src/pages/Encyclopedia.jsx`
- Test: `client/tests/pages/Encyclopedia.test.jsx`

**Interfaces:**
- Consumes: `useEncyclopediaBrowse`, `useRegisterSearchScope`, `EncyclopediaFilter`, `SpeciesCard`, `PageHeader`, `EmptyState`, `Spinner`, `readEncyclopediaFilters`.
- Produces: the `/encyclopedia` page. Renders a loading spinner, a filtered-empty state, or the grid. Search is registered with the sidebar scope; typing a query swaps the browse grid for search results (reuse `useSpeciesSearch`).

- [ ] **Step 1: Write the failing test**

Create `client/tests/pages/Encyclopedia.test.jsx`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../src/api/client'
import Encyclopedia from '../../src/pages/Encyclopedia'

vi.mock('../../src/api/client', () => ({ apiGet: vi.fn() }))

// Search scope registration touches a context; stub the hook so the page
// renders in isolation.
vi.mock('../../src/hooks/useRegisterSearchScope', () => ({ useRegisterSearchScope: vi.fn() }))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/encyclopedia']}>
        <Encyclopedia />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Encyclopedia', () => {
  afterEach(() => vi.mocked(apiGet).mockReset())

  it('renders the species grid from the browse payload', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      species: [{ id: 1, common_name: 'Monstera Deliciosa', scientific_name: 'Monstera deliciosa', pet_safe: false, difficulty: 'beginner' }],
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
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/pages/Encyclopedia.test.jsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Implement**

Create `client/src/pages/Encyclopedia.jsx`. Note the render-branch helper (no chained ternaries) and that the empty state clears filters:

```jsx
import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import EncyclopediaFilter from '../components/encyclopedia/EncyclopediaFilter'
import { applyEncyclopediaFilters, EMPTY_DRAFT, readEncyclopediaFilters } from '../components/encyclopedia/filter/config'
import SpeciesCard from '../components/encyclopedia/SpeciesCard'
import Action from '../components/ui/Action'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import { useEncyclopediaBrowse } from '../hooks/useEncyclopedia'
import { useRegisterSearchScope } from '../hooks/useRegisterSearchScope'

export default function Encyclopedia() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const filters = readEncyclopediaFilters(searchParams)
  const { data, isPending } = useEncyclopediaBrowse(filters)

  useRegisterSearchScope({
    placeholder: 'Search all species…',
    hasFilterToClear: false,
    onClearAll: useCallback(() => navigate('/encyclopedia'), [navigate]),
    renderResults: null,
  })

  const species = data?.species ?? []

  function renderBody() {
    if (isPending) return <Spinner />

    if (species.length === 0) {
      return (
        <EmptyState
          icon={<span>🔍</span>}
          title="No species match those filters"
          description="Try loosening a filter to see more of the catalogue."
          actions={
            <Action variant="secondary" onClick={() => applyEncyclopediaFilters(setSearchParams, EMPTY_DRAFT)}>
              Clear filters
            </Action>
          }
        />
      )
    }

    return (
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 list-none p-0">
        {species.map((entry) => (
          <li key={entry.id}>
            <SpeciesCard species={entry} />
          </li>
        ))}
      </ul>
    )
  }

  // PageHeader takes `eyebrow` + the heading as children (matches House/Today),
  // NOT preheading/heading props.
  return (
    <div className="flex flex-col gap-6 lg:gap-8 px-3 lg:px-6 py-4 lg:py-6">
      <PageHeader eyebrow="Your greenhouse library" compactMobile>
        Browse every <em className="text-emerald">species</em>
      </PageHeader>

      <EncyclopediaFilter />

      {renderBody()}
    </div>
  )
}
```

The `<em className="text-emerald">` inside the heading matches House ("Browse your <em>plants</em>"). Confirm `useRegisterSearchScope`'s exact option names against `hooks/useRegisterSearchScope.js` — the signature is `{ placeholder, hasFilterToClear, onClearAll, renderResults }`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/pages/Encyclopedia.test.jsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/pages/Encyclopedia.jsx client/tests/pages/Encyclopedia.test.jsx
git commit -m "feat(v2): encyclopedia browse page"
```

---

### Task 7: The species detail page + routes

**Files:**
- Create: `client/src/pages/SpeciesDetail.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/tests/pages/SpeciesDetail.test.jsx`

**Interfaces:**
- Consumes: `useSpecies` (existing), `SpeciesView`, `CommunityStats`, `Breadcrumb`, `Spinner`, `EmptyState`.
- Produces: `/encyclopedia/species/:id` and the route wiring replacing the placeholder.

- [ ] **Step 1: Write the failing test**

Create `client/tests/pages/SpeciesDetail.test.jsx`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../src/api/client'
import SpeciesDetail from '../../src/pages/SpeciesDetail'

vi.mock('../../src/api/client', () => ({ apiGet: vi.fn() }))

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
    expect(await screen.findByText('Snake Plant')).toBeInTheDocument()
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
    expect(await screen.findByText('Rare Fern')).toBeInTheDocument()
    expect(screen.getByText(/not enough growers yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/pages/SpeciesDetail.test.jsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Implement the page**

Create `client/src/pages/SpeciesDetail.jsx`:

```jsx
import { useParams } from 'react-router-dom'
import CommunityStats from '../components/encyclopedia/CommunityStats'
import SpeciesView from '../components/plants/SpeciesView'
import Action from '../components/ui/Action'
import Breadcrumb from '../components/ui/Breadcrumb'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { useSpecies } from '../hooks/useSpecies'

export default function SpeciesDetail() {
  const { id } = useParams()
  const { data: species, isPending, isError } = useSpecies(id)

  function renderBody() {
    if (isPending) return <Spinner />

    if (isError || !species) {
      return (
        <EmptyState
          icon={<span>🪴</span>}
          title="Species not found"
          description="We couldn't find that plant in the encyclopedia."
          actions={
            <Action variant="secondary" to="/encyclopedia">
              Back to browse
            </Action>
          }
        />
      )
    }

    return (
      <>
        <Breadcrumb items={[{ label: 'Encyclopedia', to: '/encyclopedia' }, { label: species.common_name }]} />
        <SpeciesView species={species} />
        <CommunityStats community={species.community} />
      </>
    )
  }

  return <div className="flex flex-col gap-6 lg:gap-8 px-3 lg:px-6 py-4 lg:py-6">{renderBody()}</div>
}
```

`Action` accepts `to` for a router link (used across the app). The Breadcrumb `items` shape (`{ label, to }`, last item no `to`) matches Plant.jsx.

- [ ] **Step 4: Wire the routes**

In `client/src/App.jsx`, replace the placeholder line

```jsx
<Route path="encyclopedia" element={<PlaceholderPage title="Encyclopedia" />} />
```

with

```jsx
<Route path="encyclopedia" element={<Encyclopedia />} />
<Route path="encyclopedia/species/:id" element={<SpeciesDetail />} />
```

and add the lazy imports at the top, matching the sibling pages (`Today`, `House`, `Plant` are all `lazy()`):

```jsx
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'))
const SpeciesDetail = lazy(() => import('./pages/SpeciesDetail'))
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/pages/SpeciesDetail.test.jsx && npx vitest run`
Expected: PASS across the suite.

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/pages/SpeciesDetail.jsx client/src/App.jsx client/tests/pages/SpeciesDetail.test.jsx
git commit -m "feat(v2): species detail page + encyclopedia routes"
```

---

### Task 8: Playwright happy path

**Files:**
- Create: `client/tests/pages/encyclopedia.spec.js`

**Interfaces:**
- End-to-end: browse grid renders → open a species → reference + community render. Uses the existing onboarding helper for a logged-in session.

- [ ] **Step 1: Write the spec**

Create `client/tests/pages/encyclopedia.spec.js`, following the structure of `tests/pages/house.spec.js` (same auth/onboard helper import). Cover:

```js
import { expect, test } from '@playwright/test'
import { registerAndOnboard } from '../helpers/onboarding'

test.describe('Encyclopedia', () => {
  test('browse grid renders and a species opens its detail page', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/encyclopedia')

    await expect(page.getByRole('heading', { level: 1, name: /Browse every/i })).toBeVisible()

    // The seeded catalogue always has at least the popular species; the grid
    // shows cards linking into detail.
    const firstCard = page.getByRole('link').filter({ hasText: /\w/ }).first()
    await firstCard.click()

    await expect(page).toHaveURL(/\/encyclopedia\/species\/\d+/)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()
  })

  test('the Filters pill narrows the grid', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/encyclopedia')

    await page.getByRole('button', { name: 'Filters' }).click()
    await page.getByRole('switch', { name: /Pet-safe only/i }).click()
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect(page).toHaveURL(/pet_safe=true/)
  })
})
```

Check `tests/helpers/onboarding.js` for the exact export name and match it. If the seeded browse grid can be empty for a brand-new user (it shouldn't — species are globally seeded, not per-user), assert on the empty state instead and note it.

- [ ] **Step 2: Run the spec**

Run: `cd /Users/rob/Development/PlantCare/client && npx playwright test tests/pages/encyclopedia.spec.js --reporter=line`
Expected: PASS. If it flakes on seed timing, mirror the wait patterns already in `house.spec.js`.

- [ ] **Step 3: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/tests/pages/encyclopedia.spec.js
git commit -m "test(v2): encyclopedia browse + detail e2e"
```

---

### Task 9: Verify in the browser, review, lint

**Files:** none (verification only).

- [ ] **Step 1: Drive the real app via the Claude extension**

With the dev server running, walk: `/encyclopedia` (grid renders, header, search pill), open the Filters popover (pet-safe toggle + difficulty + light chips), apply pet-safe (grid narrows, chip + count badge show, URL gains `pet_safe=true`), Clear all (restores), click a species card → `/encyclopedia/species/:id` (breadcrumb, reference card, community block or below-floor note), and confirm the Today "Heads up" discover tile (`/encyclopedia`) now lands on a real page. Check the console is clean on each.

- [ ] **Step 2: Review triad on the changed surfaces**

Frontend change → `/accessibility` + `/react-best-practices` (DHH only if the base-branch backend change from Task 3 Step 5 is being reviewed here). Fix blocking findings in-branch. Watch specifically: the pet-safe `role="switch"` has an accessible name and `aria-checked`; the grid `<ul>`/`<li>` semantics; SpeciesCard is a single link (no nested interactives); focus-visible on cards; the emoji photo tile is `aria-hidden`.

- [ ] **Step 3: Comment audit**

`/comment-audit` (or apply the discipline) over the diff. The new files lean on a few weight-carrying "why" comments (pet_safe tri-state, server-owns-calculations); delete any WHAT-narration that crept in.

- [ ] **Step 4: Lint last**

Run: `cd /Users/rob/Development/PlantCare && ./scripts/lint.sh`
Expected: all four checks pass.

- [ ] **Step 5: Full suite**

Run: `./scripts/run_tests.sh`
Expected: API + client green.

- [ ] **Step 6: Final commit if review/lint changed anything**

```bash
cd /Users/rob/Development/PlantCare
git add -A
git commit -m "chore(v2): review + lint pass for encyclopedia frontend" || echo "nothing to commit"
```

---

## Definition of done

- `/encyclopedia` renders a community-ranked, filterable species grid; `/encyclopedia/species/:id` renders reference data + community aggregates (or a below-floor note). The placeholder route is gone.
- Filtering reuses `FilterControl`; search reuses `useRegisterSearchScope`; reference reuses `SpeciesView`.
- Pet-safety renders tri-state — unknown never shows as safe.
- Client reads server-computed fields; nothing is recomputed.
- The Today "Heads up" discover tile lands on a real page.
- Unit + Playwright + lint green; a11y + React reviews clean.

## Dependencies on the base branch

- **Task 3 Step 5** widens `Species.browse`/controller to accept a comma-separated `difficulty` list. That commit lands on `feat-species-browse-backend` (PR #89) and flows here. If #89 has already merged to main by the time this runs, make the change on `main` via a tiny follow-up PR instead and rebase.

## Follow-ups this creates

- **Plant Doctor (R13)** gets its home on this page — mockup 25's featured card slot, once R13 is built.
- **Community "browse by outcome"** (most-grown here / thriving in low light) is the phase-2 evolution of the grid once the user base grows.
- **Pagination** when the catalogue passes ~100 rows — `useInfiniteQuery` + the cursor backend, paired with these filters.
- **Species photos**: the grid uses an emoji tile today. When real per-species imagery exists (`image_url` is already on the payload), swap the `.species-photo` gradient for the image with the emoji as fallback.
