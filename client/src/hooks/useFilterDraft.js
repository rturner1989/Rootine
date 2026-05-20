import { useCallback, useMemo, useState } from 'react'
import { EMPTY_DRAFT, presetRange } from '../components/journal/filter/config'

// Local draft state for the journal filter panel — edits stay here until
// the user hits Apply (which commits to the URL). Toggles are functional
// updates so the callbacks stay stable across renders.
export function useFilterDraft(initialFilters) {
  const [draft, setDraft] = useState(initialFilters)

  const togglePlant = useCallback(
    (plantId) =>
      setDraft((current) => ({
        ...current,
        plantIds: current.plantIds.includes(plantId)
          ? current.plantIds.filter((value) => value !== plantId)
          : [...current.plantIds, plantId],
      })),
    [],
  )

  const toggleKind = useCallback(
    (kind) =>
      setDraft((current) => ({
        ...current,
        kinds: current.kinds.includes(kind)
          ? current.kinds.filter((value) => value !== kind)
          : [...current.kinds, kind],
      })),
    [],
  )

  const applyPreset = useCallback((preset) => setDraft((current) => ({ ...current, ...presetRange(preset) })), [])

  const setDateField = useCallback(
    (field, value) => setDraft((current) => ({ ...current, [field]: value || null })),
    [],
  )

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), [])

  return useMemo(
    () => ({ draft, togglePlant, toggleKind, applyPreset, setDateField, reset }),
    [draft, togglePlant, toggleKind, applyPreset, setDateField, reset],
  )
}
