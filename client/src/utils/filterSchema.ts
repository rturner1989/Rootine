// Filter axes described as data so the URL contract, the draft editor and
// the active-count badge all derive from one declaration. Journal and
// Encyclopedia share the machinery and supply only their own schema.
//
// Output is deliberately flat: a range axis contributes two keys
// (fromKey/toKey) rather than a nested object, so consumers read
// `filters.dateFrom` directly.
//
// This describes filter UI state, not a server wire shape — unrelated to
// the Zod schemas in types/, despite the name.

type FilterValue = number | string

type MultiAxis = {
  id: string
  param: string
  type: 'multi'
  cast?: 'number'
  isValid?: (value: FilterValue) => boolean
}

type RangeAxis = {
  id: string
  type: 'range'
  fromKey: string
  toKey: string
  fromParam: string
  toParam: string
}

type BoolAxis = {
  id: string
  param: string
  type: 'bool'
}

export type FilterAxis = MultiAxis | RangeAxis | BoolAxis
export type FilterSchema = FilterAxis[]
export type FilterDraft = Record<string, unknown>

function readMulti(searchParams: URLSearchParams, axis: MultiAxis): FilterValue[] {
  const raw = searchParams.get(axis.param)
  if (!raw) return []

  return raw
    .split(',')
    .map((entry): FilterValue => (axis.cast === 'number' ? Number(entry) : entry))
    .filter((entry) => {
      if (axis.cast === 'number' && !(typeof entry === 'number' && Number.isFinite(entry))) return false
      return axis.isValid ? axis.isValid(entry) : true
    })
}

export function emptyDraft(schema: FilterSchema): FilterDraft {
  const draft: FilterDraft = {}

  for (const axis of schema) {
    if (axis.type === 'multi') draft[axis.id] = []
    else if (axis.type === 'range') {
      draft[axis.fromKey] = null
      draft[axis.toKey] = null
    } else draft[axis.id] = null
  }

  return draft
}

export function readFilters(searchParams: URLSearchParams, schema: FilterSchema): FilterDraft {
  const filters: FilterDraft = {}

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

export function writeFilters(searchParams: URLSearchParams, draft: FilterDraft, schema: FilterSchema): URLSearchParams {
  const updated = new URLSearchParams(searchParams)

  function put(param: string, value: unknown): void {
    if (value === null || value === undefined || value === '') updated.delete(param)
    else updated.set(param, String(value))
  }

  for (const axis of schema) {
    if (axis.type === 'multi') {
      const values = draft[axis.id]
      put(axis.param, Array.isArray(values) && values.length ? values.join(',') : null)
    } else if (axis.type === 'range') {
      put(axis.fromParam, draft[axis.fromKey])
      put(axis.toParam, draft[axis.toKey])
    } else {
      put(axis.param, draft[axis.id])
    }
  }

  return updated
}

export function countActive(draft: FilterDraft, schema: FilterSchema, hiddenAxisIds: string[] = []): number {
  let total = 0

  for (const axis of schema) {
    if (hiddenAxisIds.includes(axis.id)) continue

    if (axis.type === 'multi') {
      const values = draft[axis.id]
      total += Array.isArray(values) ? values.length : 0
    } else if (axis.type === 'range') {
      total += draft[axis.fromKey] || draft[axis.toKey] ? 1 : 0
    } else {
      const value = draft[axis.id]
      total += value === null || value === undefined ? 0 : 1
    }
  }

  return total
}
