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
