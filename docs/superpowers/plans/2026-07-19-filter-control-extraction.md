# FilterControl Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Journal's filter chrome into generic, schema-driven primitives so Encyclopedia can be its second consumer, without changing any Journal behaviour.

**Architecture:** A filter is described by a **schema** — a list of axes, each with a URL param, a type (`multi` / `bool` / `range`), and validation. Generic helpers read and write those params; a generic `useFilterDraft` edits a draft; `FilterControl` renders the trigger pill, popover/dialog panel and action buttons; `FilterChips` renders active-filter badges from descriptors. Domain code supplies only its schema, its field JSX, and its chip descriptors.

**The safety property this plan is built around:** the schema-driven reader produces the **exact same flat object shape** Journal already uses (`{ plantIds, kinds, dateFrom, dateTo }`). Characterisation tests written in Task 1 against today's implementation must pass **unchanged** against the generic one in Task 4. That is the proof the refactor is safe — not inspection, not hope.

**Tech Stack:** React 19, React Router `useSearchParams`, Vitest + React Testing Library, Tailwind v4, Biome.

## Global Constraints

- No user-visible change. Journal's filters must behave identically at every step.
- Journal's four Playwright filter specs in `client/tests/pages/journal.spec.js` must stay green throughout.
- Tests live in `client/tests/`, mirroring `client/src/` one-for-one. `.test.jsx` = Vitest, `.spec.js` = Playwright. Never cross them.
- Rest parameters are named `...kwargs`, never `...rest`.
- No single-letter or placeholder identifiers (`v`, `s`, `data`, `value`, `when`). Name for content, not slot.
- No chained ternaries inside JSX returns — extract a `renderX()` helper with early returns.
- Icon-only buttons use `ActionIcon`. Glyphs size to `w-2.5 / w-3 / w-4 / w-5` only.
- Run all commands from `client/`: `cd /Users/rob/Development/PlantCare/client`.
- Run `../scripts/lint.sh` as the **last** step before the final commit, never mid-task.

---

## File Structure

**Create:**
- `client/src/utils/filterSchema.js` — schema-driven URL read/write + active counting. Pure, no JSX, no React.
- `client/src/components/ui/FilterChips.jsx` — renders active-filter badges from descriptors + "Clear all".
- `client/src/components/ui/FilterControl.jsx` — trigger pill, active count, popover (desktop) / dialog (mobile), Reset/Cancel/Apply.
- `client/tests/utils/filterSchema.test.js`
- `client/tests/components/journal/filter/config.test.js` — characterisation tests (Task 1), kept permanently as Journal's regression net.
- `client/tests/hooks/useFilterDraft.test.jsx`
- `client/tests/components/ui/FilterChips.test.jsx`
- `client/tests/components/ui/FilterControl.test.jsx`

**Modify:**
- `client/src/components/journal/filter/config.js` — add `JOURNAL_FILTER_SCHEMA`; `readJournalFilters`/`applyFilters` become thin delegates.
- `client/src/hooks/useFilterDraft.js` — becomes schema-driven and domain-agnostic.
- `client/src/components/journal/filter/Panels.jsx` — panel chrome moves to `FilterControl`; keeps only `Fields`.
- `client/src/components/journal/filter/ActiveChips.jsx` — builds descriptors, delegates rendering to `FilterChips`.
- `client/src/components/journal/FilterToolbar.jsx` — becomes a thin `FilterControl` consumer.
- `client/src/components/journal/filter/Fields.jsx` — updated to the generic draft API.

---

### Task 1: Pin current filter behaviour with characterisation tests

These tests describe what the code does **today**. Unlike normal TDD they pass the moment they're written — so the verification step is a deliberate mutation, proving they'd catch a regression. Without this, Tasks 3–4 are a blind refactor of a shipped surface with zero unit coverage.

**Files:**
- Test: `client/tests/components/journal/filter/config.test.js`

**Interfaces:**
- Consumes: `readJournalFilters(searchParams)`, `applyFilters(setSearchParams, draft)`, `EMPTY_DRAFT` from `src/components/journal/filter/config.js`
- Produces: a permanent regression net. Task 4 re-runs this file untouched.

- [ ] **Step 1: Write the characterisation tests**

Create `client/tests/components/journal/filter/config.test.js`:

```jsx
import { describe, expect, it, vi } from 'vitest'
import { applyFilters, EMPTY_DRAFT, readJournalFilters } from '../../../../src/components/journal/filter/config'

// Characterisation tests: these pin the behaviour of the journal filter
// URL contract as it shipped, so the schema-driven rewrite can be proven
// identical rather than assumed identical. They must pass unchanged
// before and after the extraction.
describe('readJournalFilters', () => {
  it('reads every axis from the query string', () => {
    const params = new URLSearchParams('plant_ids=1,2&kinds=water,feed&date_from=2026-01-01&date_to=2026-02-01')
    expect(readJournalFilters(params)).toEqual({
      plantIds: [1, 2],
      kinds: ['water', 'feed'],
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    })
  })

  it('returns the empty draft shape when nothing is set', () => {
    expect(readJournalFilters(new URLSearchParams())).toEqual(EMPTY_DRAFT)
  })

  it('drops plant ids that are not positive finite numbers', () => {
    const params = new URLSearchParams('plant_ids=1,abc,-3,0,4')
    expect(readJournalFilters(params).plantIds).toEqual([1, 4])
  })

  it('drops kinds that are not in the known vocabulary', () => {
    const params = new URLSearchParams('kinds=water,bogus,photo')
    expect(readJournalFilters(params).kinds).toEqual(['water', 'photo'])
  })

  it('treats a missing date bound as null rather than undefined', () => {
    const params = new URLSearchParams('date_from=2026-01-01')
    const filters = readJournalFilters(params)
    expect(filters.dateFrom).toBe('2026-01-01')
    expect(filters.dateTo).toBeNull()
  })
})

describe('applyFilters', () => {
  // applyFilters hands React Router an updater function; capture it and
  // run it against a known starting query string to see the result.
  function commit(draft, startingQuery = '') {
    const setSearchParams = vi.fn()
    applyFilters(setSearchParams, draft)
    const [updater, options] = setSearchParams.mock.calls[0]
    return { params: updater(new URLSearchParams(startingQuery)), options }
  }

  it('writes every populated axis to the query string', () => {
    const { params } = commit({
      plantIds: [3, 7],
      kinds: ['photo'],
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    })
    expect(params.get('plant_ids')).toBe('3,7')
    expect(params.get('kinds')).toBe('photo')
    expect(params.get('date_from')).toBe('2026-01-01')
    expect(params.get('date_to')).toBe('2026-02-01')
  })

  it('deletes params for empty axes instead of writing blanks', () => {
    const { params } = commit(EMPTY_DRAFT, 'plant_ids=1&kinds=water&date_from=2026-01-01&date_to=2026-02-01')
    expect(params.get('plant_ids')).toBeNull()
    expect(params.get('kinds')).toBeNull()
    expect(params.get('date_from')).toBeNull()
    expect(params.get('date_to')).toBeNull()
  })

  it('preserves unrelated query params', () => {
    const { params } = commit(EMPTY_DRAFT, 'tab=photos&view=month')
    expect(params.get('tab')).toBe('photos')
    expect(params.get('view')).toBe('month')
  })

  it('pushes a history entry rather than replacing', () => {
    const { options } = commit(EMPTY_DRAFT)
    expect(options).toEqual({ replace: false })
  })
})
```

- [ ] **Step 2: Run the tests — they should pass immediately**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/components/journal/filter/config.test.js`
Expected: PASS, 9 tests. (They describe existing behaviour, so passing is correct.)

- [ ] **Step 3: Prove the tests actually bite**

Temporarily break `src/components/journal/filter/config.js` — in `applyFilters`, change `{ replace: false }` to `{ replace: true }`.

Run: `npx vitest run tests/components/journal/filter/config.test.js`
Expected: FAIL on "pushes a history entry rather than replacing".

Now revert that change, and instead change the `plantIds` filter in `readJournalFilters` from `value > 0` to `value >= 0`.

Run: `npx vitest run tests/components/journal/filter/config.test.js`
Expected: FAIL on "drops plant ids that are not positive finite numbers" (`0` now leaks in).

Revert. Re-run — expected: PASS, 9 tests.

A characterisation test that survives both mutations is worthless; do not continue until both fail as described.

- [ ] **Step 4: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/tests/components/journal/filter/config.test.js
git commit -m "test(v2): pin journal filter URL contract before extraction"
```

---

### Task 2: Pin `useFilterDraft` behaviour

**Files:**
- Test: `client/tests/hooks/useFilterDraft.test.jsx`

**Interfaces:**
- Consumes: `useFilterDraft(initialFilters)` from `src/hooks/useFilterDraft.js`, returning `{ draft, togglePlant, toggleKind, applyPreset, setDateField, reset }`
- Produces: regression net for Task 5, which changes this hook's API.

- [ ] **Step 1: Write the characterisation tests**

Create `client/tests/hooks/useFilterDraft.test.jsx`:

```jsx
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DATE_PRESETS, EMPTY_DRAFT } from '../../src/components/journal/filter/config'
import { useFilterDraft } from '../../src/hooks/useFilterDraft'

describe('useFilterDraft', () => {
  it('starts from the filters it was given', () => {
    const initial = { plantIds: [1], kinds: ['water'], dateFrom: null, dateTo: null }
    const { result } = renderHook(() => useFilterDraft(initial))
    expect(result.current.draft).toEqual(initial)
  })

  it('toggles a plant on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))

    act(() => result.current.togglePlant(4))
    expect(result.current.draft.plantIds).toEqual([4])

    act(() => result.current.togglePlant(4))
    expect(result.current.draft.plantIds).toEqual([])
  })

  it('toggles a kind on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))

    act(() => result.current.toggleKind('photo'))
    expect(result.current.draft.kinds).toEqual(['photo'])

    act(() => result.current.toggleKind('photo'))
    expect(result.current.draft.kinds).toEqual([])
  })

  it('applying the all-time preset clears both date bounds', () => {
    const initial = { plantIds: [], kinds: [], dateFrom: '2026-01-01', dateTo: '2026-02-01' }
    const { result } = renderHook(() => useFilterDraft(initial))
    const allTime = DATE_PRESETS.find((preset) => preset.days == null)

    act(() => result.current.applyPreset(allTime))
    expect(result.current.draft.dateFrom).toBeNull()
    expect(result.current.draft.dateTo).toBeNull()
  })

  it('applying a day-bounded preset sets both bounds', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))
    const lastSeven = DATE_PRESETS.find((preset) => preset.days === 7)

    act(() => result.current.applyPreset(lastSeven))
    expect(result.current.draft.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current.draft.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('normalises an empty date field to null', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))

    act(() => result.current.setDateField('dateFrom', '2026-03-01'))
    expect(result.current.draft.dateFrom).toBe('2026-03-01')

    act(() => result.current.setDateField('dateFrom', ''))
    expect(result.current.draft.dateFrom).toBeNull()
  })

  it('reset returns the draft to empty', () => {
    const initial = { plantIds: [2], kinds: ['feed'], dateFrom: '2026-01-01', dateTo: null }
    const { result } = renderHook(() => useFilterDraft(initial))

    act(() => result.current.reset())
    expect(result.current.draft).toEqual(EMPTY_DRAFT)
  })
})
```

- [ ] **Step 2: Run the tests**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/hooks/useFilterDraft.test.jsx`
Expected: PASS, 7 tests.

- [ ] **Step 3: Prove they bite**

In `src/hooks/useFilterDraft.js`, change `setDateField`'s `value || null` to just `value`.

Run: `npx vitest run tests/hooks/useFilterDraft.test.jsx`
Expected: FAIL on "normalises an empty date field to null".

Revert. Re-run — expected: PASS, 7 tests.

- [ ] **Step 4: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/tests/hooks/useFilterDraft.test.jsx
git commit -m "test(v2): pin useFilterDraft behaviour before generalising"
```

---

### Task 3: Build the schema-driven filter utilities

Genuine TDD — this code does not exist yet.

**Files:**
- Create: `client/src/utils/filterSchema.js`
- Test: `client/tests/utils/filterSchema.test.js`

**Interfaces:**
- Produces, used by Tasks 4–8:
  - `readFilters(searchParams, schema)` → flat object keyed by axis `id` (range axes contribute two keys, `fromKey`/`toKey`)
  - `writeFilters(searchParams, draft, schema)` → new `URLSearchParams`
  - `emptyDraft(schema)` → flat object with `[]` for multi, `null` for bool and range bounds
  - `countActive(draft, schema, hiddenAxisIds = [])` → number
- Axis shapes:
  - `{ id, param, type: 'multi', cast?: 'number', isValid?: (value) => boolean }`
  - `{ id, param, type: 'bool' }`
  - `{ id, type: 'range', fromKey, toKey, fromParam, toParam }`

- [ ] **Step 1: Write the failing tests**

Create `client/tests/utils/filterSchema.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { countActive, emptyDraft, readFilters, writeFilters } from '../../src/utils/filterSchema'

const SCHEMA = [
  { id: 'plantIds', param: 'plant_ids', type: 'multi', cast: 'number', isValid: (id) => id > 0 },
  { id: 'kinds', param: 'kinds', type: 'multi', isValid: (kind) => ['water', 'feed'].includes(kind) },
  { id: 'petSafe', param: 'pet_safe', type: 'bool' },
  { id: 'date', type: 'range', fromKey: 'dateFrom', toKey: 'dateTo', fromParam: 'date_from', toParam: 'date_to' },
]

describe('emptyDraft', () => {
  it('gives multi axes an array and every other key null', () => {
    expect(emptyDraft(SCHEMA)).toEqual({
      plantIds: [],
      kinds: [],
      petSafe: null,
      dateFrom: null,
      dateTo: null,
    })
  })
})

describe('readFilters', () => {
  it('reads each axis type into a flat object', () => {
    const params = new URLSearchParams('plant_ids=1,2&kinds=water&pet_safe=true&date_from=2026-01-01')
    expect(readFilters(params, SCHEMA)).toEqual({
      plantIds: [1, 2],
      kinds: ['water'],
      petSafe: true,
      dateFrom: '2026-01-01',
      dateTo: null,
    })
  })

  it('casts and validates multi values, dropping the rest', () => {
    const params = new URLSearchParams('plant_ids=1,abc,-3,0,4&kinds=water,bogus')
    const filters = readFilters(params, SCHEMA)
    expect(filters.plantIds).toEqual([1, 4])
    expect(filters.kinds).toEqual(['water'])
  })

  it('reads pet_safe=false as false, not as absent', () => {
    const params = new URLSearchParams('pet_safe=false')
    expect(readFilters(params, SCHEMA).petSafe).toBe(false)
  })

  it('returns the empty draft when nothing is set', () => {
    expect(readFilters(new URLSearchParams(), SCHEMA)).toEqual(emptyDraft(SCHEMA))
  })
})

describe('writeFilters', () => {
  it('writes populated axes and deletes empty ones', () => {
    const starting = new URLSearchParams('plant_ids=9&kinds=feed&pet_safe=true&date_from=2020-01-01')
    const params = writeFilters(starting, emptyDraft(SCHEMA), SCHEMA)
    expect(params.get('plant_ids')).toBeNull()
    expect(params.get('kinds')).toBeNull()
    expect(params.get('pet_safe')).toBeNull()
    expect(params.get('date_from')).toBeNull()
  })

  it('round-trips a populated draft', () => {
    const draft = { plantIds: [3, 7], kinds: ['feed'], petSafe: true, dateFrom: '2026-01-01', dateTo: '2026-02-01' }
    const params = writeFilters(new URLSearchParams(), draft, SCHEMA)
    expect(readFilters(params, SCHEMA)).toEqual(draft)
  })

  it('writes pet_safe=false rather than dropping it', () => {
    const draft = { ...emptyDraft(SCHEMA), petSafe: false }
    const params = writeFilters(new URLSearchParams(), draft, SCHEMA)
    expect(params.get('pet_safe')).toBe('false')
  })

  it('leaves unrelated params untouched', () => {
    const params = writeFilters(new URLSearchParams('tab=photos'), emptyDraft(SCHEMA), SCHEMA)
    expect(params.get('tab')).toBe('photos')
  })
})

describe('countActive', () => {
  it('counts each populated multi axis by its length', () => {
    const draft = { ...emptyDraft(SCHEMA), plantIds: [1, 2], kinds: ['water'] }
    expect(countActive(draft, SCHEMA)).toBe(3)
  })

  it('counts a set bool as one, including false', () => {
    expect(countActive({ ...emptyDraft(SCHEMA), petSafe: false }, SCHEMA)).toBe(1)
  })

  it('counts a range as one regardless of how many bounds are set', () => {
    const oneBound = { ...emptyDraft(SCHEMA), dateFrom: '2026-01-01' }
    const bothBounds = { ...emptyDraft(SCHEMA), dateFrom: '2026-01-01', dateTo: '2026-02-01' }
    expect(countActive(oneBound, SCHEMA)).toBe(1)
    expect(countActive(bothBounds, SCHEMA)).toBe(1)
  })

  it('ignores hidden axes', () => {
    const draft = { ...emptyDraft(SCHEMA), plantIds: [1, 2], kinds: ['water'] }
    expect(countActive(draft, SCHEMA, ['plantIds'])).toBe(1)
  })

  it('counts an empty draft as zero', () => {
    expect(countActive(emptyDraft(SCHEMA), SCHEMA)).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/utils/filterSchema.test.js`
Expected: FAIL — `Failed to resolve import "../../src/utils/filterSchema"`.

- [ ] **Step 3: Implement the utilities**

Create `client/src/utils/filterSchema.js`:

```js
// Filter axes described as data so the URL contract, the draft editor and
// the active-count badge all derive from one declaration. Journal and
// Encyclopedia share the machinery and supply only their own schema.
//
// Output is deliberately flat: a range axis contributes two keys
// (fromKey/toKey) rather than a nested object, so consumers read
// `filters.dateFrom` directly.

function readMulti(searchParams, axis) {
  const raw = searchParams.get(axis.param)
  if (!raw) return []

  return raw
    .split(',')
    .map((entry) => (axis.cast === 'number' ? Number(entry) : entry))
    .filter((entry) => {
      if (axis.cast === 'number' && !Number.isFinite(entry)) return false
      return axis.isValid ? axis.isValid(entry) : true
    })
}

export function emptyDraft(schema) {
  const draft = {}

  for (const axis of schema) {
    if (axis.type === 'multi') draft[axis.id] = []
    else if (axis.type === 'range') {
      draft[axis.fromKey] = null
      draft[axis.toKey] = null
    } else draft[axis.id] = null
  }

  return draft
}

export function readFilters(searchParams, schema) {
  const filters = {}

  for (const axis of schema) {
    if (axis.type === 'multi') {
      filters[axis.id] = readMulti(searchParams, axis)
    } else if (axis.type === 'range') {
      filters[axis.fromKey] = searchParams.get(axis.fromParam) || null
      filters[axis.toKey] = searchParams.get(axis.toParam) || null
    } else {
      const raw = searchParams.get(axis.param)
      filters[axis.id] = raw === null ? null : raw === 'true'
    }
  }

  return filters
}

export function writeFilters(searchParams, draft, schema) {
  const updated = new URLSearchParams(searchParams)

  function put(param, value) {
    if (value === null || value === undefined || value === '') updated.delete(param)
    else updated.set(param, String(value))
  }

  for (const axis of schema) {
    if (axis.type === 'multi') {
      put(axis.param, draft[axis.id]?.length ? draft[axis.id].join(',') : null)
    } else if (axis.type === 'range') {
      put(axis.fromParam, draft[axis.fromKey])
      put(axis.toParam, draft[axis.toKey])
    } else {
      put(axis.param, draft[axis.id])
    }
  }

  return updated
}

export function countActive(draft, schema, hiddenAxisIds = []) {
  let total = 0

  for (const axis of schema) {
    if (hiddenAxisIds.includes(axis.id)) continue

    if (axis.type === 'multi') total += draft[axis.id]?.length ?? 0
    else if (axis.type === 'range') total += draft[axis.fromKey] || draft[axis.toKey] ? 1 : 0
    else total += draft[axis.id] === null || draft[axis.id] === undefined ? 0 : 1
  }

  return total
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/utils/filterSchema.test.js`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/utils/filterSchema.js client/tests/utils/filterSchema.test.js
git commit -m "feat(v2): schema-driven filter URL helpers"
```

---

### Task 4: Move Journal's URL contract onto the schema

The payoff task. Task 1's tests must pass **unedited** afterwards.

**Files:**
- Modify: `client/src/components/journal/filter/config.js`

**Interfaces:**
- Consumes: `readFilters`, `writeFilters`, `emptyDraft`, `countActive` from `src/utils/filterSchema.js`
- Produces: `JOURNAL_FILTER_SCHEMA` (consumed by Tasks 5–8). `readJournalFilters`/`applyFilters`/`EMPTY_DRAFT` keep identical signatures and shapes.

- [ ] **Step 1: Add the schema and delegate to it**

In `client/src/components/journal/filter/config.js`, add the import at the top:

```js
import { emptyDraft, readFilters, writeFilters } from '../../../utils/filterSchema'
```

Add the schema below the `KIND_EMOJI` block:

```js
export const JOURNAL_FILTER_SCHEMA = [
  { id: 'plantIds', param: 'plant_ids', type: 'multi', cast: 'number', isValid: (id) => id > 0 },
  { id: 'kinds', param: 'kinds', type: 'multi', isValid: (kind) => JOURNAL_KINDS.includes(kind) },
  { id: 'date', type: 'range', fromKey: 'dateFrom', toKey: 'dateTo', fromParam: 'date_from', toParam: 'date_to' },
]
```

Replace the `EMPTY_DRAFT` constant:

```js
export const EMPTY_DRAFT = emptyDraft(JOURNAL_FILTER_SCHEMA)
```

Replace the whole bodies of `readJournalFilters` and `applyFilters`:

```js
export function readJournalFilters(searchParams) {
  return readFilters(searchParams, JOURNAL_FILTER_SCHEMA)
}

export function applyFilters(setSearchParams, next) {
  setSearchParams((prev) => writeFilters(prev, next, JOURNAL_FILTER_SCHEMA), { replace: false })
}
```

Leave `presetRange`, `dateChipLabel`, `dateRangeSummaryLabel`, `DATE_PRESETS`, `KIND_LABEL`, `KIND_EMOJI` and `JOURNAL_KINDS` exactly as they are.

- [ ] **Step 2: Run Task 1's characterisation tests, unedited**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/components/journal/filter/config.test.js`
Expected: PASS, 9 tests.

If any fail, the generic implementation is not equivalent — fix `filterSchema.js`, never the test. Editing a characterisation test to match new behaviour destroys the only evidence the refactor was safe.

- [ ] **Step 3: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS, all files.

- [ ] **Step 4: Run Journal's e2e specs**

Run: `npx playwright test tests/pages/journal.spec.js --reporter=line`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/components/journal/filter/config.js
git commit -m "refactor(v2): drive journal filter URL contract from a schema"
```

---

### Task 5: Generalise `useFilterDraft`

**Files:**
- Modify: `client/src/hooks/useFilterDraft.js`
- Modify: `client/tests/hooks/useFilterDraft.test.jsx`
- Modify: `client/src/components/journal/filter/Fields.jsx`

**Interfaces:**
- Consumes: `emptyDraft` from `src/utils/filterSchema.js`; `JOURNAL_FILTER_SCHEMA` from journal config
- Produces: `useFilterDraft(initialFilters, schema)` → `{ draft, toggleValue(axisId, value), setValue(key, value), reset }`. `togglePlant`/`toggleKind`/`applyPreset`/`setDateField` are gone; callers use the generic pair.

- [ ] **Step 1: Update the hook**

Replace the whole of `client/src/hooks/useFilterDraft.js`:

```js
import { useCallback, useMemo, useState } from 'react'
import { emptyDraft } from '../utils/filterSchema'

// Local draft state for a filter panel — edits stay here until Apply
// commits them to the URL. Domain-agnostic: the schema says which axes
// exist, the consumer says which one it is editing.
export function useFilterDraft(initialFilters, schema) {
  const [draft, setDraft] = useState(initialFilters)

  // Multi axes only — adds the value if absent, removes it if present.
  const toggleValue = useCallback(
    (axisId, value) =>
      setDraft((current) => ({
        ...current,
        [axisId]: current[axisId].includes(value)
          ? current[axisId].filter((entry) => entry !== value)
          : [...current[axisId], value],
      })),
    [],
  )

  // Bool axes and range bounds. Empty string normalises to null so a
  // cleared date input reads as "unset" rather than "".
  const setValue = useCallback(
    (key, value) => setDraft((current) => ({ ...current, [key]: value === '' ? null : value })),
    [],
  )

  const reset = useCallback(() => setDraft(emptyDraft(schema)), [schema])

  return useMemo(() => ({ draft, toggleValue, setValue, reset }), [draft, toggleValue, setValue, reset])
}
```

- [ ] **Step 2: Update the characterisation tests to the new API**

The behaviour being pinned is unchanged; only the call sites move. In `client/tests/hooks/useFilterDraft.test.jsx`, change the import line to:

```jsx
import { DATE_PRESETS, EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA, presetRange } from '../../src/components/journal/filter/config'
```

Pass the schema in every `renderHook` call — `useFilterDraft(initial, JOURNAL_FILTER_SCHEMA)` — and replace the four behavioural tests that used the removed methods:

```jsx
  it('toggles a plant on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))

    act(() => result.current.toggleValue('plantIds', 4))
    expect(result.current.draft.plantIds).toEqual([4])

    act(() => result.current.toggleValue('plantIds', 4))
    expect(result.current.draft.plantIds).toEqual([])
  })

  it('toggles a kind on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))

    act(() => result.current.toggleValue('kinds', 'photo'))
    expect(result.current.draft.kinds).toEqual(['photo'])

    act(() => result.current.toggleValue('kinds', 'photo'))
    expect(result.current.draft.kinds).toEqual([])
  })

  it('applying a date preset sets both bounds through setValue', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))
    const range = presetRange(DATE_PRESETS.find((preset) => preset.days === 7))

    act(() => {
      result.current.setValue('dateFrom', range.dateFrom)
      result.current.setValue('dateTo', range.dateTo)
    })
    expect(result.current.draft.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current.draft.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('normalises an empty date field to null', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))

    act(() => result.current.setValue('dateFrom', '2026-03-01'))
    expect(result.current.draft.dateFrom).toBe('2026-03-01')

    act(() => result.current.setValue('dateFrom', ''))
    expect(result.current.draft.dateFrom).toBeNull()
  })
```

Delete the old "applying the all-time preset clears both date bounds" test — `presetRange` still owns that behaviour and is covered where it lives.

- [ ] **Step 3: Update `Fields.jsx` to the new API**

Open `client/src/components/journal/filter/Fields.jsx` and rewrite its call sites:

- `togglePlant(plant.id)` → `toggleValue('plantIds', plant.id)`
- `toggleKind(kind)` → `toggleValue('kinds', kind)`
- `setDateField('dateFrom', event.target.value)` → `setValue('dateFrom', event.target.value)`
- `setDateField('dateTo', event.target.value)` → `setValue('dateTo', event.target.value)`
- `applyPreset(preset)` → replace with two `setValue` calls from the preset range:

```jsx
function handlePreset(preset) {
  const range = presetRange(preset)
  setValue('dateFrom', range.dateFrom)
  setValue('dateTo', range.dateTo)
}
```

Add `presetRange` to the existing import from `./config`, and update the destructured props from `{ togglePlant, toggleKind, applyPreset, setDateField }` to `{ toggleValue, setValue }`.

- [ ] **Step 4: Update `Panels.jsx` to pass the schema**

In `client/src/components/journal/filter/Panels.jsx`, both panels call `useFilterDraft(initialFilters)`. Change both to:

```jsx
const form = useFilterDraft(initialFilters, JOURNAL_FILTER_SCHEMA)
```

Add to the imports:

```jsx
import { JOURNAL_FILTER_SCHEMA } from './config'
```

- [ ] **Step 5: Run the tests**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run`
Expected: PASS, all files.

Run: `npx playwright test tests/pages/journal.spec.js --reporter=line`
Expected: PASS, 12 tests. This is the real check — the filter panel is now driven by generic code end to end.

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/hooks/useFilterDraft.js client/tests/hooks/useFilterDraft.test.jsx client/src/components/journal/filter/Fields.jsx client/src/components/journal/filter/Panels.jsx
git commit -m "refactor(v2): make useFilterDraft schema-driven"
```

---

### Task 6: Extract the `FilterChips` primitive

**Files:**
- Create: `client/src/components/ui/FilterChips.jsx`
- Test: `client/tests/components/ui/FilterChips.test.jsx`

**Interfaces:**
- Produces: `<FilterChips chips={[{ key, label, icon, onClear, clearLabel }]} onClearAll={fn} />`. `icon` is optional JSX. Renders nothing when `chips` is empty.

- [ ] **Step 1: Write the failing test**

Create `client/tests/components/ui/FilterChips.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FilterChips from '../../../src/components/ui/FilterChips'

describe('FilterChips', () => {
  const chips = [
    { key: 'plant-1', label: 'Monstera', clearLabel: 'Clear Monstera filter', onClear: vi.fn() },
    { key: 'kind-water', label: 'Water', clearLabel: 'Remove Water filter', onClear: vi.fn() },
  ]

  it('renders nothing when there are no chips', () => {
    const { container } = render(<FilterChips chips={[]} onClearAll={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a chip per descriptor', () => {
    render(<FilterChips chips={chips} onClearAll={vi.fn()} />)
    expect(screen.getByText('Monstera')).toBeInTheDocument()
    expect(screen.getByText('Water')).toBeInTheDocument()
  })

  it('clearing a chip calls only that chip handler', async () => {
    const clearMonstera = vi.fn()
    const clearWater = vi.fn()
    render(
      <FilterChips
        chips={[
          { key: 'plant-1', label: 'Monstera', clearLabel: 'Clear Monstera filter', onClear: clearMonstera },
          { key: 'kind-water', label: 'Water', clearLabel: 'Remove Water filter', onClear: clearWater },
        ]}
        onClearAll={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Clear Monstera filter' }))
    expect(clearMonstera).toHaveBeenCalledOnce()
    expect(clearWater).not.toHaveBeenCalled()
  })

  it('Clear all calls onClearAll', async () => {
    const onClearAll = vi.fn()
    render(<FilterChips chips={chips} onClearAll={onClearAll} />)

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onClearAll).toHaveBeenCalledOnce()
  })

  it('renders a chip icon when one is supplied', () => {
    render(
      <FilterChips
        chips={[{ key: 'kind-water', label: 'Water', clearLabel: 'x', onClear: vi.fn(), icon: <span>💧</span> }]}
        onClearAll={vi.fn()}
      />,
    )
    expect(screen.getByText('💧')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/components/ui/FilterChips.test.jsx`
Expected: FAIL — `Failed to resolve import ".../ui/FilterChips"`.

- [ ] **Step 3: Implement**

Create `client/src/components/ui/FilterChips.jsx`:

```jsx
import Action from './Action'
import Badge from './Badge'

// Active-filter chips + Clear all. Takes descriptors rather than reading
// any domain state, so the journal's plant thumbnails and the
// encyclopedia's trait chips render through the same control.
export default function FilterChips({ chips, onClearAll }) {
  if (!chips.length) return null

  return (
    <>
      {chips.map((chip) => (
        <Badge key={chip.key} scheme="emerald" size="sm" onClear={chip.onClear} clearLabel={chip.clearLabel}>
          {chip.icon}
          <span className="truncate max-w-[140px]">{chip.label}</span>
        </Badge>
      ))}

      <Action
        variant="unstyled"
        type="button"
        onClick={onClearAll}
        className="text-[11px] font-bold text-ink-softer underline decoration-dotted hover:text-coral-deep"
      >
        Clear all
      </Action>
    </>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/ui/FilterChips.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/components/ui/FilterChips.jsx client/tests/components/ui/FilterChips.test.jsx
git commit -m "feat(v2): FilterChips primitive"
```

---

### Task 7: Extract the `FilterControl` primitive

**Files:**
- Create: `client/src/components/ui/FilterControl.jsx`
- Test: `client/tests/components/ui/FilterControl.test.jsx`

**Interfaces:**
- Consumes: `useFilterDraft` (Task 5), `countActive` (Task 3), existing `Popover`, `Dialog`, `Card`, `Action`, `useMediaQuery`
- Produces:

```jsx
<FilterControl
  schema={SCHEMA}
  filters={filters}
  hiddenAxisIds={['plantIds']}
  title="Filter journal entries"
  onApply={(draft) => void}
  renderFields={(form) => <Fields {...form} />}
>
  <ActiveChips />
</FilterControl>
```

**Chip row is `children`, and only `children`.** `FilterControl` deliberately does *not* take a `chips` prop as well — one slot, one way to fill it. Journal's chip row reads its own URL state and is also rendered standalone by the calendar views, so it stays a component (`ActiveChips`); Encyclopedia will pass a `<FilterChips>` directly. Per the slot-pattern rule, a single always-paired slot could have been a prop, but the chip row is genuinely a variable-content region and both consumers already own a component for it.

- [ ] **Step 1: Write the failing test**

Create `client/tests/components/ui/FilterControl.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FilterControl from '../../../src/components/ui/FilterControl'

const SCHEMA = [
  { id: 'kinds', param: 'kinds', type: 'multi', isValid: () => true },
  { id: 'petSafe', param: 'pet_safe', type: 'bool' },
]

const EMPTY = { kinds: [], petSafe: null }

function renderControl(props = {}) {
  return render(
    <FilterControl
      schema={SCHEMA}
      filters={EMPTY}
      title="Filter things"
      onApply={vi.fn()}
      renderFields={(form) => (
        <button type="button" onClick={() => form.toggleValue('kinds', 'water')}>
          Toggle water
        </button>
      )}
      {...props}
    />,
  )
}

describe('FilterControl', () => {
  it('shows no count badge when nothing is active', () => {
    renderControl()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  it('labels the trigger with the active count', () => {
    renderControl({ filters: { kinds: ['water', 'feed'], petSafe: true } })
    expect(screen.getByRole('button', { name: 'Filters, 3 active' })).toBeInTheDocument()
  })

  it('excludes hidden axes from the active count', () => {
    renderControl({ filters: { kinds: ['water', 'feed'], petSafe: true }, hiddenAxisIds: ['kinds'] })
    expect(screen.getByRole('button', { name: 'Filters, 1 active' })).toBeInTheDocument()
  })

  it('opens the panel and applies the edited draft', async () => {
    const onApply = vi.fn()
    renderControl({ onApply })

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: 'Toggle water' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ kinds: ['water'], petSafe: null })
  })

  it('cancel closes without applying', async () => {
    const onApply = vi.fn()
    renderControl({ onApply })

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: 'Toggle water' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onApply).not.toHaveBeenCalled()
  })

  it('reset empties the draft before apply', async () => {
    const onApply = vi.fn()
    renderControl({ filters: { kinds: ['feed'], petSafe: true }, onApply })

    await userEvent.click(screen.getByRole('button', { name: 'Filters, 2 active' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ kinds: [], petSafe: null })
  })

  it('renders the chip row passed as children', () => {
    renderControl({ children: <span>Water chip</span> })
    expect(screen.getByText('Water chip')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rob/Development/PlantCare/client && npx vitest run tests/components/ui/FilterControl.test.jsx`
Expected: FAIL — `Failed to resolve import ".../ui/FilterControl"`.

- [ ] **Step 3: Implement**

Create `client/src/components/ui/FilterControl.jsx`:

```jsx
import { faFilter } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState } from 'react'
import { useFilterDraft } from '../../hooks/useFilterDraft'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { countActive } from '../../utils/filterSchema'
import Action from './Action'
import Card from './Card'
import Dialog from './Dialog'
import Popover from './Popover'

// Reset (left) + Cancel / Apply (right) — the action trio shared by both
// panel chromes.
function FilterActions({ onReset, onCancel, onApply }) {
  return (
    <>
      <Action
        variant="unstyled"
        type="button"
        onClick={onReset}
        className="text-[11px] font-bold text-ink-softer hover:text-coral-deep"
      >
        Reset
      </Action>
      <div className="flex gap-2">
        <Action type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Action>
        <Action type="button" variant="primary" onClick={onApply}>
          Apply
        </Action>
      </div>
    </>
  )
}

// The panel body is identical either side of the mobile split; only the
// chrome around it differs, so the draft lives here and both branches
// render the same fields.
function FilterPanel({ schema, filters, title, renderFields, onApply, onClose, mobile }) {
  const form = useFilterDraft(filters, schema)
  const fields = renderFields(form)
  const actions = <FilterActions onReset={form.reset} onCancel={onClose} onApply={() => onApply(form.draft)} />

  if (mobile) {
    return (
      <>
        <Card.Header divider={false}>
          <p className="text-lg font-extrabold text-ink">{title}</p>
        </Card.Header>
        <Card.Body className="flex flex-col gap-3 py-1">{fields}</Card.Body>
        <Card.Footer divider={false} className="flex items-center gap-2.5 pt-3 [&>:first-child]:mr-auto">
          {actions}
        </Card.Footer>
      </>
    )
  }

  return (
    <>
      {fields}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-paper-edge">{actions}</div>
    </>
  )
}

// Generic filter chrome: trigger pill with active count, a chip-row slot,
// and a popover (desktop) / dialog (mobile) panel that edits a draft and
// hands it back on Apply. Domain code supplies the schema, the fields and
// the chip row; this owns none of that vocabulary.
export default function FilterControl({
  schema,
  filters,
  hiddenAxisIds = [],
  title,
  onApply,
  renderFields,
  surface = 'glass',
  children,
}) {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const buttonRef = useRef(null)

  const activeCount = countActive(filters, schema, hiddenAxisIds)
  const buttonClass = activeCount > 0 ? 'bg-mint text-emerald' : 'bg-paper-deep text-ink-soft hover:bg-paper-edge'

  function commitDraft(draft) {
    onApply(draft)
    setOpen(false)
  }

  function handleClose({ reason } = {}) {
    setOpen(false)
    if (reason === 'escape') buttonRef.current?.focus()
  }

  const panel = (
    <FilterPanel
      schema={schema}
      filters={filters}
      title={title}
      renderFields={renderFields}
      onApply={commitDraft}
      onClose={handleClose}
      mobile={isMobile}
    />
  )

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      <Action
        ref={buttonRef}
        variant="unstyled"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 ease-out ${buttonClass}`}
      >
        <FontAwesomeIcon icon={faFilter} className="w-3 h-3" aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold bg-emerald text-paper">
            {activeCount}
          </span>
        )}
      </Action>

      {children}

      {isMobile ? (
        <Dialog open={open} onClose={handleClose} title={title}>
          {panel}
        </Dialog>
      ) : (
        <Popover
          open={open}
          onClose={handleClose}
          anchorRef={buttonRef}
          role="dialog"
          label={title}
          placement="bottom-left"
          surface={surface}
          autoFocus
          modal
          className="w-[340px] max-w-[calc(100vw-1.5rem)] p-4"
        >
          {panel}
        </Popover>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/ui/FilterControl.test.jsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/src/components/ui/FilterControl.jsx client/tests/components/ui/FilterControl.test.jsx
git commit -m "feat(v2): FilterControl primitive"
```

---

### Task 8: Migrate Journal onto the primitives and remove the duplicates

**Files:**
- Modify: `client/src/components/journal/FilterToolbar.jsx`
- Modify: `client/src/components/journal/filter/ActiveChips.jsx`
- Delete: `client/src/components/journal/filter/Panels.jsx`

**Interfaces:**
- Consumes: `FilterControl` (Task 7), `FilterChips` (Task 6), `JOURNAL_FILTER_SCHEMA` (Task 4)
- Produces: no new interface. Journal's public behaviour is unchanged.

- [ ] **Step 1: Rewrite `ActiveChips.jsx` to build descriptors**

Replace the render body of `client/src/components/journal/filter/ActiveChips.jsx`, keeping its existing props, comment and the `clearPlant`/`clearKind`/`clearDate`/`clearAll` handlers. Swap the `Badge`/`Action` imports for `FilterChips`, drop the now-unused `Action` and `Badge` imports, and replace everything from `if (activePlants.length === 0 ...)` to the end with:

```jsx
  const chips = [
    ...activePlants.map((plant) => ({
      key: `plant-${plant.id}`,
      label: plant.nickname,
      clearLabel: `Clear ${plant.nickname} filter`,
      onClear: () => clearPlant(plant.id),
      icon: <PlantThumb src={plant.species?.image_url} size="sm" />,
    })),
    ...activeKinds.map((kind) => ({
      key: `kind-${kind}`,
      label: KIND_LABEL[kind],
      clearLabel: `Remove ${KIND_LABEL[kind]} filter`,
      onClear: () => clearKind(kind),
      icon: <ChipEmoji emoji={KIND_EMOJI[kind]} />,
    })),
  ]

  if (dateLabel) {
    chips.push({
      key: 'date',
      label: dateLabel,
      clearLabel: 'Clear date filter',
      onClear: clearDate,
      icon: <ChipEmoji emoji="📅" />,
    })
  }

  return <FilterChips chips={chips} onClearAll={clearAll} />
}

// The circular emoji wafer used inside kind + date chips.
function ChipEmoji({ emoji }) {
  return (
    <span
      aria-hidden="true"
      className="w-4 h-4 rounded-full bg-paper inline-flex items-center justify-center text-[10px] leading-none shrink-0"
    >
      {emoji}
    </span>
  )
}
```

Delete the early `if (activePlants.length === 0 && activeKinds.length === 0 && !dateLabel) return null` guard — `FilterChips` already returns null on an empty list.

- [ ] **Step 2: Rewrite `FilterToolbar.jsx` as a thin consumer**

Replace the whole of `client/src/components/journal/FilterToolbar.jsx`:

```jsx
import { useSearchParams } from 'react-router-dom'
import { usePlants } from '../../hooks/usePlants'
import FilterControl from '../ui/FilterControl'
import ActiveChips from './filter/ActiveChips'
import Fields from './filter/Fields'
import { applyFilters, EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA, readJournalFilters } from './filter/config'

// The journal's filter control: supplies the schema, the field JSX and the
// chip row to the generic FilterControl. Filter logic lives in
// filter/config; the panel body in filter/Fields.
//
// `lockedPlantId` (Plant Detail journal) hides the plant filter; `hideKinds`
// (Photos tab) hides event types; `surface` picks the popover treatment.
export default function FilterToolbar({ lockedPlantId = null, hideKinds = false, surface = 'glass' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readJournalFilters(searchParams)
  const { data: plants } = usePlants()

  const hidePlants = lockedPlantId != null
  const hiddenAxisIds = [hidePlants && 'plantIds', hideKinds && 'kinds'].filter(Boolean)

  return (
    <FilterControl
      schema={JOURNAL_FILTER_SCHEMA}
      filters={filters}
      hiddenAxisIds={hiddenAxisIds}
      title="Filter journal entries"
      surface={surface}
      onApply={(draft) => applyFilters(setSearchParams, draft)}
      renderFields={(form) => (
        <Fields plants={plants} hidePlants={hidePlants} hideKinds={hideKinds} {...form} />
      )}
    >
      <ActiveChips lockedPlantId={lockedPlantId} hideKinds={hideKinds} />
    </FilterControl>
  )
}
```

Note the unused `EMPTY_DRAFT` import is still needed — `ActiveChips` owns "Clear all" for Journal, so drop `EMPTY_DRAFT` from this file's import if Biome flags it as unused.

`ActiveChips` stays the chip source for Journal because it reads its own URL state and is also rendered standalone by the calendar views. `FilterControl` needs no change here — it already renders `children` in the chip slot from Task 7.

- [ ] **Step 3: Delete the superseded panel file**

```bash
cd /Users/rob/Development/PlantCare
git rm client/src/components/journal/filter/Panels.jsx
```

- [ ] **Step 4: Verify nothing still imports it**

Run: `cd /Users/rob/Development/PlantCare/client && grep -rn "Panels" src/ tests/`
Expected: no output.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: PASS, all files.

Run: `npx playwright test tests/pages/journal.spec.js --reporter=line`
Expected: PASS, 12 tests.

Run: `cd /Users/rob/Development/PlantCare && ./scripts/run_tests.sh`
Expected: API + client both green.

- [ ] **Step 6: Verify in the browser**

Start the app, open `/journal`, and confirm by hand: the Filters pill opens the popover; selecting an event type writes `kinds` to the URL and shows a chip; the count badge matches the number of active filters; Clear all empties both chips and URL; the panel becomes a dialog below 768px.

- [ ] **Step 7: Lint last, then commit**

Run: `cd /Users/rob/Development/PlantCare && ./scripts/lint.sh`
Expected: all four checks pass.

```bash
git add -A
git commit -m "refactor(v2): migrate journal filters onto shared primitives"
```

---

## Definition of done

- `FilterControl`, `FilterChips` and `filterSchema` exist, are tested, and carry no journal vocabulary.
- Task 1's characterisation tests pass unedited against the schema-driven implementation.
- Journal's 12 Playwright specs and the full Vitest suite are green.
- `Panels.jsx` is gone and nothing references it.
- No user-visible change to Journal.

## Follow-up

Ticket 2 (backend: pet-safety booleans, community aggregates, browse endpoint) and Ticket 3 (Encyclopedia frontend) get their own plans, per the spec's sequencing. Ticket 3 is the second consumer that justifies this extraction — if its axes don't fit the schema shape defined here, that is a signal to revisit `filterSchema.js` rather than to fork it.
