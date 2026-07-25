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
