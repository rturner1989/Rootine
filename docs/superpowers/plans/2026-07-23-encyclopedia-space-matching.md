# Encyclopedia Space Matching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **Not committed** — planning artifact, kept local per Rob's preference on superpowers docs.

**Goal:** A "By space" view in the Encyclopedia that groups browsable species into per-space sections, showing which species suit each of the user's rooms by light + humidity.

**Architecture:** Server owns the fit rule (plant-care logic + the user's spaces are server-side): a `?group=spaces` browse mode returns `{ groups: [{ space, species }] }`, reusing `Species.browse` for filtering/ranking. Frontend adds a House-style header toggle (Grid / By space, URL state) and a `SpaceGroups` view that reuses `SpeciesGrid`.

**Tech Stack:** Rails 8 API + PostgreSQL + Minitest; React 19 + Vite + TanStack Query + Vitest + Playwright.

**Branch:** off `feat-encyclopedia-frontend` (#92) — this expands that Encyclopedia work. Create `feat-encyclopedia-space-matching` from it.

## Global Constraints

- Match axes: **light + humidity only**. Temperature is excluded (`suggested_temperature_level` is hardcoded `'average'`). Vocab already aligned: `low/medium/bright` (light), `dry/average/humid` (humidity) on both Space and Species.
- Light fit: `species_light_rank <= space_light_rank` (tolerant, more light is fine). Humidity fit: `|species − space| <= 1` step. Fit = both.
- Server owns the calc. `private def` inline style. `params.expect`. Fat model, no service objects. Guard clauses with a blank line after.
- Client reads server-computed values; no re-deriving the fit rule client-side.
- Tests in `client/tests/` mirroring `src/`; `.test.jsx` Vitest, `.spec.js` Playwright. `...kwargs` not `...rest`. No chained ternaries in JSX → `renderX()` early returns.
- Backend cmds via `docker compose exec -T api bin/rails ...` from repo root. Lint `./scripts/lint.sh` last.

---

## File Structure

**Backend — modify:**
- `api/app/models/species.rb` — `LIGHT_RANK`/`HUMIDITY_RANK` constants, `fits_space?`, `browse_grouped_by_spaces`
- `api/app/controllers/api/v1/species_controller.rb` — `grouped_payload` + one index guard clause
- Tests: `api/test/models/species_browse_test.rb`, `api/test/controllers/api/v1/species_controller_test.rb`

**Frontend — create:**
- `client/src/components/encyclopedia/SpaceGroups.jsx`
- `client/tests/components/encyclopedia/SpaceGroups.test.jsx`
- `client/tests/hooks/useEncyclopedia.test.jsx` (extend)

**Frontend — modify:**
- `client/src/api/queryKeys.js` — `species.grouped(filters)`
- `client/src/hooks/useEncyclopedia.js` — `useEncyclopediaGrouped`
- `client/src/hooks/useSpaces.js` — `useUpdateSpace` invalidates the grouped query
- `client/src/pages/encyclopedia/Encyclopedia.jsx` — toggle + render branching
- Tests: `client/tests/pages/encyclopedia/Encyclopedia.test.jsx`, `client/tests/pages/encyclopedia.spec.js`

---

### Task 1: Fit rule + grouping on the model

**Files:**
- Modify: `api/app/models/species.rb`
- Test: `api/test/models/species_browse_test.rb`

**Interfaces:**
- Produces: `Species::LIGHT_RANK`, `Species::HUMIDITY_RANK`; `Species.fits_space?(species, space)` → bool; `Species.browse_grouped_by_spaces(spaces, **filters)` → `[{ space:, species: [Species] }]`.

- [ ] **Step 1: Write the failing tests**

Add to `api/test/models/species_browse_test.rb`:

```ruby
  # --- space matching ---

  def space_with(light:, humidity:)
    # A detached Space instance is enough for fits_space? (reads columns only).
    Space.new(light_level: light, humidity_level: humidity)
  end

  test 'fits_space? light is tolerant — species needs at most what the space gives' do
    low = Species.new(light_requirement: 'low')          # suggested_light_level 'low'
    bright = Species.new(light_requirement: 'bright_direct') # 'bright'

    assert Species.fits_space?(low, space_with(light: 'low', humidity: 'average'))
    assert Species.fits_space?(low, space_with(light: 'bright', humidity: 'average'))
    assert Species.fits_space?(bright, space_with(light: 'bright', humidity: 'average'))
    refute Species.fits_space?(bright, space_with(light: 'low', humidity: 'average'))
  end

  test 'fits_space? humidity matches within one step, both directions' do
    humid = Species.new(light_requirement: 'low', humidity_preference: 'high')  # suggested 'humid'
    dry = Species.new(light_requirement: 'low', humidity_preference: 'low')      # suggested 'dry'

    assert Species.fits_space?(humid, space_with(light: 'low', humidity: 'average'))
    assert Species.fits_space?(humid, space_with(light: 'low', humidity: 'humid'))
    refute Species.fits_space?(humid, space_with(light: 'low', humidity: 'dry'))
    refute Species.fits_space?(dry, space_with(light: 'low', humidity: 'humid'))
  end

  test 'browse_grouped_by_spaces groups matching species per space' do
    john = users(:john)
    # john's fixtures: living_room (medium light, average humidity), bedroom.
    groups = Species.browse_grouped_by_spaces(john.spaces.active)

    living = groups.find { |group| group[:space] == spaces(:living_room) }
    assert_not_nil living
    # Monstera (bright_indirect → 'bright') should NOT fit a medium-light room;
    # Snake Plant (low_to_bright → 'medium') should.
    names = living[:species].map(&:common_name)
    assert_includes names, 'Snake Plant'
    refute_includes names, 'Monstera Deliciosa'
  end

  test 'browse_grouped_by_spaces lets a species appear in multiple fitting spaces' do
    john = users(:john)
    groups = Species.browse_grouped_by_spaces(john.spaces.active)

    fitting_counts = groups.sum { |group| group[:species].count { |s| s.common_name == 'Snake Plant' } }
    assert_operator fitting_counts, :>=, 1
  end

  test 'browse_grouped_by_spaces keeps a space with no matches as an empty group' do
    dark = users(:john).spaces.create!(name: 'Dark Closet', icon: 'couch', category: 'indoor',
                                       light_level: 'low', humidity_level: 'dry')
    groups = Species.browse_grouped_by_spaces(users(:john).spaces.active)

    closet = groups.find { |group| group[:space] == dark }
    assert_not_nil closet, 'empty-match space must still appear as a group'
  end
```

Confirm the fixtures' `light_level`/`humidity_level` for `living_room`/`bedroom` (`test/fixtures/spaces.yml`) — the assertions assume living_room is medium light. If a fixture lacks an explicit level it defaults (`medium` light, `average` humidity) per the schema, which is what these tests assume. Adjust the asserted names if the fixture values differ.

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T api bin/rails test test/models/species_browse_test.rb`
Expected: FAIL — `fits_space?` / `browse_grouped_by_spaces` undefined.

- [ ] **Step 3: Implement**

In `api/app/models/species.rb`, add to the constants section:

```ruby
  # Ordinal ranks for space matching. NOT derived from Space::*_MODIFIERS —
  # those values are schedule multipliers, and relying on hash order for
  # ranking is fragile.
  LIGHT_RANK = { 'low' => 0, 'medium' => 1, 'bright' => 2 }.freeze
  HUMIDITY_RANK = { 'dry' => 0, 'average' => 1, 'humid' => 2 }.freeze
```

Add to the class-methods (catalogue reads) section, near `browse`:

```ruby
  # Group the browsable catalogue by which of the given spaces each species
  # suits (light + humidity). Reuses browse for filtering + grower ranking, so
  # species stay ranked within each group. A species can fit several spaces
  # and appears in each; a space with no matches stays as an empty group.
  def self.browse_grouped_by_spaces(spaces, **filters)
    ranked = browse(**filters)
    spaces.map { |space| { space: space, species: ranked.select { |species| fits_space?(species, space) } } }
  end

  # Light is tolerant (a species needs at most what the space provides —
  # more light is fine). Humidity is a proximity match within one step
  # (too dry AND too humid both fail). Temperature is excluded — every
  # species suggests 'average', so it can't discriminate.
  def self.fits_space?(species, space)
    LIGHT_RANK[species.suggested_light_level] <= LIGHT_RANK[space.light_level] &&
      (HUMIDITY_RANK[species.suggested_humidity_level] - HUMIDITY_RANK[space.humidity_level]).abs <= 1
  end
```

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T api bin/rails test test/models/species_browse_test.rb`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/app/models/species.rb api/test/models/species_browse_test.rb
git commit -m "feat(v2): match species to spaces by light + humidity"
```

---

### Task 2: Grouped browse endpoint

**Files:**
- Modify: `api/app/controllers/api/v1/species_controller.rb`
- Test: `api/test/controllers/api/v1/species_controller_test.rb`

**Interfaces:**
- Produces: `GET /api/v1/species?browse=1&group=spaces` → `{ groups: [{ space: {...}, species: [...] }] }`, honouring `pet_safe`/`difficulty`/`light`, over `current_user.spaces.active`.

- [ ] **Step 1: Write the failing tests**

Add to `api/test/controllers/api/v1/species_controller_test.rb`:

```ruby
  test 'grouped browse returns a group per active space with fitting species' do
    get api_v1_species_index_path(browse: 1, group: 'spaces'), headers: auth_headers(@user), as: :json

    body = response.parsed_body
    assert body.key?('groups')
    space_names = body['groups'].map { |group| group['space']['name'] }
    assert_includes space_names, 'Living Room'
  end

  test 'grouped browse excludes archived spaces' do
    @user.spaces.first.update!(archived_at: Time.current)
    archived_name = @user.spaces.first.name

    get api_v1_species_index_path(browse: 1, group: 'spaces'), headers: auth_headers(@user), as: :json

    names = response.parsed_body['groups'].map { |group| group['space']['name'] }
    assert_not_includes names, archived_name
  end

  test 'grouped browse applies filters within each group' do
    get api_v1_species_index_path(browse: 1, group: 'spaces', pet_safe: true), headers: auth_headers(@user), as: :json

    body = response.parsed_body
    all_species = body['groups'].flat_map { |group| group['species'] }
    assert(all_species.none? { |species| species['pet_safe'] == false })
  end
```

Match the existing file's auth (`@user` from setup, `auth_headers`, `as: :json`).

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T api bin/rails test test/controllers/api/v1/species_controller_test.rb`
Expected: FAIL — `group=spaces` returns the flat browse payload (no `groups` key).

- [ ] **Step 3: Implement**

In `api/app/controllers/api/v1/species_controller.rb`, add a guard clause to `index_payload` (before the plain browse return):

```ruby
      private def index_payload
        return Species.search_with_api(params[:q]) if params[:q].present?
        return grouped_payload if params[:browse].present? && params[:group] == 'spaces'
        return browse_payload if params[:browse].present?

        Species.popular_payload
      end
```

Add the builder near `browse_payload`:

```ruby
      private def grouped_payload
        { groups: Species.browse_grouped_by_spaces(current_user.spaces.active, **browse_filters) }
      end
```

Each group is already `{ space: <Space>, species: [<Species>] }`; Rails renders the nested hash through `Space#as_json` / `Species#as_json` — no re-wrapping needed.

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T api bin/rails test test/controllers/api/v1/species_controller_test.rb`
Expected: PASS.

- [ ] **Step 5: Full API suite + commit**

Run: `cd /Users/rob/Development/PlantCare && ./scripts/run_tests.sh api`
Expected: green.

```bash
git add api/app/controllers/api/v1/species_controller.rb api/test/controllers/api/v1/species_controller_test.rb
git commit -m "feat(v2): grouped-by-space browse endpoint"
```

---

### Task 3: Grouped query hook

**Files:**
- Modify: `client/src/api/queryKeys.js`, `client/src/hooks/useEncyclopedia.js`
- Test: `client/tests/hooks/useEncyclopedia.test.jsx`

**Interfaces:**
- Produces: `queryKeys.species.grouped(filters)` → `['species', 'browse', 'grouped', filters]`; `useEncyclopediaGrouped(filters)` → query returning `{ groups }`.

- [ ] **Step 1: Write the failing test**

Add to `client/tests/hooks/useEncyclopedia.test.jsx`:

```jsx
import { useEncyclopediaBrowse, useEncyclopediaGrouped } from '../../src/hooks/useEncyclopedia'

// ... inside the existing describe or a new one:
describe('useEncyclopediaGrouped', () => {
  afterEach(() => vi.mocked(apiGet).mockReset())

  it('requests grouped browse with the group=spaces param', async () => {
    vi.mocked(apiGet).mockResolvedValue({ groups: [] })
    const { result } = renderHook(() => useEncyclopediaGrouped({}), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(apiGet).mock.calls[0][0]
    expect(url).toContain('browse=1')
    expect(url).toContain('group=spaces')
  })

  it('threads filters into the grouped request', async () => {
    vi.mocked(apiGet).mockResolvedValue({ groups: [] })
    const { result } = renderHook(() => useEncyclopediaGrouped({ petSafe: true, difficulty: ['beginner'], light: [] }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(apiGet).mock.calls[0][0]
    expect(url).toContain('pet_safe=true')
    expect(url).toContain('difficulty=beginner')
  })
})
```

(Reuse the existing `wrapper` + `apiGet` mock at the top of the file.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/hooks/useEncyclopedia.test.jsx`
Expected: FAIL — `useEncyclopediaGrouped` not exported.

- [ ] **Step 3: Add the query key**

In `client/src/api/queryKeys.js`, extend `species`:

```js
  species: {
    popular: ['species', 'popular'],
    search: (query) => ['species', 'search', query],
    browse: (filters) => ['species', 'browse', filters],
    grouped: (filters) => ['species', 'browse', 'grouped', filters],
    detail: (id) => ['species', id],
  },
```

- [ ] **Step 4: Add the hook**

In `client/src/hooks/useEncyclopedia.js`, reuse `browseQuery` and add:

```js
export function useEncyclopediaGrouped(filters) {
  return useQuery({
    queryKey: queryKeys.species.grouped(filters),
    queryFn: () => apiGet(`/api/v1/species?${browseQuery(filters)}&group=spaces`),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  })
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/hooks/useEncyclopedia.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/api/queryKeys.js client/src/hooks/useEncyclopedia.js client/tests/hooks/useEncyclopedia.test.jsx
git commit -m "feat(v2): grouped-species query hook"
```

---

### Task 4: SpaceGroups view

**Files:**
- Create: `client/src/components/encyclopedia/SpaceGroups.jsx`
- Test: `client/tests/components/encyclopedia/SpaceGroups.test.jsx`

**Interfaces:**
- Consumes: `SpeciesGrid`, `Heading`, `getSpaceEmoji`.
- Produces: `<SpaceGroups groups={[{ space, species }]} />` — one section per group; empty groups render an inline note.

- [ ] **Step 1: Write the failing test**

Create `client/tests/components/encyclopedia/SpaceGroups.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpaceGroups from '../../../src/components/encyclopedia/SpaceGroups'

function renderGroups(groups) {
  return render(
    <MemoryRouter>
      <SpaceGroups groups={groups} />
    </MemoryRouter>,
  )
}

describe('SpaceGroups', () => {
  it('renders a section per space with its species', () => {
    renderGroups([
      { space: { id: 1, name: 'Living Room', icon: 'couch' }, species: [{ id: 9, common_name: 'Snake Plant', pet_safe: false }] },
      { space: { id: 2, name: 'Bedroom', icon: 'bed' }, species: [] },
    ])
    expect(screen.getByRole('heading', { name: /Living Room/i })).toBeInTheDocument()
    expect(screen.getByText('Snake Plant')).toBeInTheDocument()
  })

  it('shows an empty note for a space with no matches', () => {
    renderGroups([{ space: { id: 2, name: 'Bedroom', icon: 'bed' }, species: [] }])
    expect(screen.getByText(/nothing in the catalogue fits/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/encyclopedia/SpaceGroups.test.jsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Implement**

Create `client/src/components/encyclopedia/SpaceGroups.jsx`:

```jsx
import { getSpaceEmoji } from '../../utils/spaceIcons'
import Heading from '../ui/Heading'
import SpeciesGrid from './SpeciesGrid'

// The "By space" view: one section per space, listing the species that fit it
// (server-computed). Reuses SpeciesGrid so cards read identically to browse.
export default function SpaceGroups({ groups }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.space.id} className="flex flex-col gap-3">
          <Heading as="h2" variant="panel" className="text-ink flex items-center gap-2 !text-[18px]">
            <span aria-hidden="true">{getSpaceEmoji(group.space.icon)}</span>
            Great for your {group.space.name}
          </Heading>
          {renderGroupBody(group)}
        </section>
      ))}
    </div>
  )
}

function renderGroupBody(group) {
  if (group.species.length === 0) {
    return (
      <p className="text-sm text-ink-soft italic px-1">
        Nothing in the catalogue fits {group.space.name} yet — try search for more.
      </p>
    )
  }

  return <SpeciesGrid species={group.species} />
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/encyclopedia/SpaceGroups.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/components/encyclopedia/SpaceGroups.jsx client/tests/components/encyclopedia/SpaceGroups.test.jsx
git commit -m "feat(v2): SpaceGroups view"
```

---

### Task 5: Wire the toggle into the Encyclopedia page

**Files:**
- Modify: `client/src/pages/encyclopedia/Encyclopedia.jsx`
- Test: `client/tests/pages/encyclopedia/Encyclopedia.test.jsx`

**Interfaces:**
- Consumes: `useEncyclopediaGrouped`, `SpaceGroups`, `SegmentedControl`.
- Produces: header toggle (Grid / By space), `?view=spaces` URL state, grouped render branch.

- [ ] **Step 1: Write the failing test**

Add to `client/tests/pages/encyclopedia/Encyclopedia.test.jsx` (grouped path — the file already mocks `apiGet`; the grouped hook hits the same mock, so return `{ groups }` when the URL has `view=spaces`):

```jsx
  it('renders grouped sections when view=spaces', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      groups: [{ space: { id: 1, name: 'Living Room', icon: 'couch' }, species: [{ id: 9, common_name: 'Snake Plant', pet_safe: false }] }],
    })

    // render at /encyclopedia?view=spaces — adjust renderPage to accept an entry
    renderPage('/encyclopedia?view=spaces')
    expect(await screen.findByRole('heading', { name: /Living Room/i })).toBeInTheDocument()
  })
```

Update the test's `renderPage` helper to accept an optional initial entry: `function renderPage(entry = '/encyclopedia') { ... initialEntries={[entry]} ... }`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/pages/encyclopedia/Encyclopedia.test.jsx`
Expected: FAIL — no Living Room heading (grouped branch not wired).

- [ ] **Step 3: Implement**

In `client/src/pages/encyclopedia/Encyclopedia.jsx`:

Add imports:

```jsx
import { faLayerGroup, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons'
import SegmentedControl from '../../components/form/SegmentedControl'
import SpaceGroups from '../../components/encyclopedia/SpaceGroups'
import { useEncyclopediaGrouped } from '../../hooks/useEncyclopedia'
```

Add the view options near the top (module scope):

```jsx
const VIEW_OPTIONS = [
  { value: 'grid', label: 'Grid', icon: faTableCellsLarge },
  { value: 'spaces', label: 'By space', icon: faLayerGroup },
]
```

Inside the component, read the view from the URL and add the grouped query:

```jsx
  const view = searchParams.get('view') === 'spaces' ? 'spaces' : 'grid'
  const grouped = useEncyclopediaGrouped(filters)

  function setView(next) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'spaces') params.set('view', 'spaces')
        else params.delete('view')
        return params
      },
      { replace: true },
    )
  }
```

Extend `renderBody` (search still wins; then grouped; then flat):

```jsx
  function renderBody() {
    if (searching) return <SpeciesSearchResults query={query} />

    if (view === 'spaces') {
      if (grouped.isPending) return <Spinner />

      const groups = grouped.data?.groups ?? []
      if (groups.length === 0) {
        return (
          <EmptyState
            icon={<span>🪟</span>}
            title="Add a space to see recommendations"
            description="Once you've set up a space, we'll show which plants suit its light and humidity."
            actions={
              <Action variant="secondary" to="/house">
                Go to your spaces
              </Action>
            }
          />
        )
      }

      return <SpaceGroups groups={groups} />
    }

    if (isPending) return <Spinner />
    // ... existing filtered-empty + flat SpeciesGrid branches unchanged
  }
```

Add the toggle to `PageHeader`'s `actions` (search hides the toggle — it's irrelevant mid-search):

```jsx
      <PageHeader
        eyebrow="Your greenhouse library"
        meta="A curated shelf of well-loved plants — search to explore the full library"
        compactMobile
        actions={
          searching ? null : (
            <SegmentedControl label="View" labelHidden value={view} onChange={setView} options={VIEW_OPTIONS} />
          )
        }
      >
        Popular <em className="text-emerald">species</em>
      </PageHeader>
```

Also hide `EncyclopediaFilter` in the spaces view? No — filters apply within groups, so keep the filter visible in both grid and spaces views; only hide it while searching (existing `{!searching && <EncyclopediaFilter />}`).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/pages/encyclopedia/Encyclopedia.test.jsx && npx vitest run`
Expected: PASS across the suite.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/pages/encyclopedia/Encyclopedia.jsx client/tests/pages/encyclopedia/Encyclopedia.test.jsx
git commit -m "feat(v2): Grid / By space toggle on the Encyclopedia"
```

---

### Task 6: Reflow recommendations on space edit

**Files:**
- Modify: `client/src/hooks/useSpaces.js`

**Interfaces:**
- `useUpdateSpace` invalidates the grouped query so editing a space's light/humidity reflows recommendations.

- [ ] **Step 1: Add the invalidation**

In `client/src/hooks/useSpaces.js`, `useUpdateSpace`'s `onSuccess`, after the plants invalidation:

```jsx
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      // Space env drives which species suit it — reflow the grouped view.
      queryClient.invalidateQueries({ queryKey: ['species', 'browse', 'grouped'] })
```

(Partial-match invalidation catches every filter variant of the grouped key.)

- [ ] **Step 2: Verify the suite still green**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/hooks/useSpaces.js
git commit -m "feat(v2): reflow space recommendations when a space env changes"
```

---

### Task 7: Playwright, browser verify, lint

**Files:**
- Modify: `client/tests/pages/encyclopedia.spec.js`

- [ ] **Step 1: Add the e2e**

Add to `client/tests/pages/encyclopedia.spec.js`:

```js
  test('the By space toggle groups species by the user\'s spaces', async ({ page }) => {
    await registerAndOnboard(page)
    await page.goto('/encyclopedia')

    await page.getByRole('radio', { name: /By space/i }).click()

    await expect(page).toHaveURL(/view=spaces/)
    // Onboarding creates at least one space, so at least one group heading shows.
    await expect(page.getByRole('heading', { name: /Great for your/i }).first()).toBeVisible()
  })
```

Check how `SegmentedControl` exposes its options (radio inside label) — match the accessible role/name; if it's not `radio`, use the actual role from a passing journal/house test.

- [ ] **Step 2: Run the spec**

Run: `cd /Users/rob/Development/PlantCare/client && npx playwright test tests/pages/encyclopedia.spec.js --reporter=line`
Expected: PASS.

- [ ] **Step 3: Browser-verify via the Claude extension**

Walk `/encyclopedia`: toggle Grid ↔ By space (URL flips `?view=spaces`), grouped sections render per space with fitting species (a bright-demanding plant absent from a medium room), filters narrow the groups, search hides the toggle + shows flat results. Edit a space's light in House → return to the grouped view → recommendations reflow. Console clean.

- [ ] **Step 4: Review + lint**

`/accessibility` + `/react-best-practices` over the changed surfaces (section headings, toggle role, grouped grids). `/comment-audit`. Then:

Run: `cd /Users/rob/Development/PlantCare && ./scripts/lint.sh` and `./scripts/run_tests.sh`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(v2): space-matching e2e + review/lint pass" || echo "nothing to commit"
```

---

## Definition of done

- `?browse=1&group=spaces` returns `{ groups }` over the user's active spaces, filtered + grower-ranked, with empty groups retained and archived spaces excluded.
- Encyclopedia has a Grid / By space header toggle (`?view=spaces`); grouped view renders a section per space via `SpaceGroups` + `SpeciesGrid`; search overrides.
- The fit rule (light-tolerant, humidity ±1) lives server-side and is mutation-tested for the light/humidity edges.
- Editing a space's env reflows the grouped view.
- No-spaces empty state; per-group empty note.
- Unit + Playwright + lint green; a11y + React reviews clean.

## Follow-ups

- Temperature axis when `suggested_temperature_level` becomes real.
- The other `project_auto_layout_suggestions` slices (best-space-on-add, doctor mismatch, auto-layout).
- Fit-strength ranking / "% fit" — deliberately not built.
- Caching / nightly job — only if the fold measures slow.
