import { useCallback, useMemo, useState } from 'react'
import { emptyDraft } from '../utils/filterSchema'

// Local draft state for a filter panel — edits stay here until Apply
// commits them to the URL. Domain-agnostic: the schema says which axes
// exist, the consumer says which one it is editing.
//
// `schema` must be a stable reference (a module-level constant, like
// JOURNAL_FILTER_SCHEMA) — `reset` keys its identity off it, so an inline
// array literal would rebuild `reset` every render and churn the memo.
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
