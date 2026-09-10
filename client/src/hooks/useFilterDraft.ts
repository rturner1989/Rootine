import { useCallback, useMemo, useState } from 'react'
import { emptyDraft, type FilterDraft, type FilterSchema } from '../utils/filterSchema'

// Local draft state for a filter panel — edits stay here until Apply
// commits them to the URL. Domain-agnostic: the schema says which axes
// exist, the consumer says which one it is editing.
//
// `schema` must be a stable reference (a module-level constant, like
// JOURNAL_FILTER_SCHEMA) — `reset` keys its identity off it, so an inline
// array literal would rebuild `reset` every render and churn the memo.
export function useFilterDraft(initialFilters: FilterDraft, schema: FilterSchema) {
  const [draft, setDraft] = useState<FilterDraft>(initialFilters)

  // Multi axes only — adds the value if absent, removes it if present.
  const toggleValue = useCallback(
    (axisId: string, value: unknown) =>
      setDraft((current) => ({
        ...current,
        [axisId]: (current[axisId] as unknown[]).includes(value)
          ? (current[axisId] as unknown[]).filter((entry) => entry !== value)
          : [...(current[axisId] as unknown[]), value],
      })),
    [],
  )

  // Bool axes and range bounds. Empty string normalises to null so a
  // cleared date input reads as "unset" rather than "".
  const setValue = useCallback(
    (key: string, value: unknown) => setDraft((current) => ({ ...current, [key]: value === '' ? null : value })),
    [],
  )

  const reset = useCallback(() => setDraft(emptyDraft(schema)), [schema])

  return useMemo(() => ({ draft, toggleValue, setValue, reset }), [draft, toggleValue, setValue, reset])
}
