import type { SetURLSearchParams } from 'react-router-dom'
import { emptyDraft, type FilterDraft, type FilterSchema, readFilters, writeFilters } from '../../../utils/filterSchema'

type DifficultyValue = 'beginner' | 'intermediate' | 'advanced'
type LightValue = 'low' | 'medium' | 'bright'

type FilterOption<Value extends string> = { value: Value; label: string; emoji: string }

export const DIFFICULTY_OPTIONS: FilterOption<DifficultyValue>[] = [
  { value: 'beginner', label: 'Beginner', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🌿' },
  { value: 'advanced', label: 'Advanced', emoji: '🌳' },
]

// Matches Space's light vocabulary — the browse endpoint filters on the
// species' derived suggested_light_level, which uses these same keys.
export const LIGHT_OPTIONS: FilterOption<LightValue>[] = [
  { value: 'low', label: 'Low light', emoji: '🌑' },
  { value: 'medium', label: 'Medium light', emoji: '⛅' },
  { value: 'bright', label: 'Bright light', emoji: '☀️' },
]

const DIFFICULTY_VALUES = new Set<string>(DIFFICULTY_OPTIONS.map((option) => option.value))
const LIGHT_VALUES = new Set<string>(LIGHT_OPTIONS.map((option) => option.value))

function isDifficultyValue(value: number | string): value is DifficultyValue {
  return typeof value === 'string' && DIFFICULTY_VALUES.has(value)
}

function isLightValue(value: number | string): value is LightValue {
  return typeof value === 'string' && LIGHT_VALUES.has(value)
}

export const ENCYCLOPEDIA_FILTER_SCHEMA: FilterSchema = [
  { id: 'petSafe', param: 'pet_safe', type: 'bool' },
  { id: 'difficulty', param: 'difficulty', type: 'multi', isValid: isDifficultyValue },
  { id: 'light', param: 'light', type: 'multi', isValid: isLightValue },
]

export const EMPTY_DRAFT: FilterDraft = emptyDraft(ENCYCLOPEDIA_FILTER_SCHEMA)

export type EncyclopediaFilterState = {
  petSafe: boolean | null
  difficulty: DifficultyValue[]
  light: LightValue[]
}

export function readEncyclopediaFilters(searchParams: URLSearchParams): EncyclopediaFilterState {
  // readFilters is generic over any FilterSchema and returns a loosely
  // typed FilterDraft (Record<string, unknown>) — this schema's shape is
  // fixed by ENCYCLOPEDIA_FILTER_SCHEMA above, so the concrete return type
  // is safe to assert here rather than re-declared at every call site.
  return readFilters(searchParams, ENCYCLOPEDIA_FILTER_SCHEMA) as EncyclopediaFilterState
}

export function applyEncyclopediaFilters(setSearchParams: SetURLSearchParams, next: FilterDraft): void {
  setSearchParams((prev) => writeFilters(prev, next, ENCYCLOPEDIA_FILTER_SCHEMA), { replace: false })
}
