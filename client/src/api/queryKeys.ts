// Single home for the app's TanStack Query keys, so a resource's cache
// identity is written once and every reader and invalidator shares it.
// A key that drifts by one element fails silently: the query still runs,
// the invalidation just never lands.
//
// Two shapes, by need rather than for their own sake:
//   - a resource with one key is that key   → queryKeys.weather
//   - a resource with variants is an object → queryKeys.plants.detail(id),
//     whose `all` is the prefix its variants share and what
//     invalidateQueries matches on.
//
// Keys stay flat array tuples per the project cache-key convention — the
// nesting here is in the registry, never in the key itself.
export const queryKeys = {
  profile: ['profile'],
  weather: ['weather'],
  notifications: ['notifications'],

  dashboard: {
    all: ['dashboard'],
    // Today reads the undated key; the week calendar passes a date.
    forDate: (date?: string | null) => (date ? ['dashboard', date] : ['dashboard']),
  },

  plants: {
    all: ['plants'],
    // Space-scoped list keys off the whole `all` prefix, so a plant
    // mutation's invalidateQueries(plants.all) still cascades to it.
    list: (spaceId?: number | null) => (spaceId ? ['plants', { spaceId }] : ['plants']),
    detail: (id: number) => ['plants', id],
    // Nested under the plant so invalidating one cascades to its logs.
    careLogs: (plantId: number, careType?: string) => ['plants', plantId, 'careLogs', careType],
  },

  spaces: {
    all: ['spaces'],
    list: (scope?: string) => ['spaces', scope],
    detail: (id: number) => ['spaces', id],
    presets: ['spaces', 'presets'],
  },

  species: {
    popular: ['species', 'popular'],
    search: (query: string) => ['species', 'search', query],
    browse: (filters: unknown) => ['species', 'browse', filters],
    grouped: (filters: unknown) => ['species', 'browse', 'grouped', filters],
    detail: (id: number) => ['species', id],
  },

  journal: {
    all: ['journal'],
    list: (filters: unknown) => ['journal', filters],
    calendar: (from: string, to: string, filters: unknown) => ['journal', 'calendar', from, to, filters],
  },

  photos: {
    all: ['photos'],
    list: (filters: unknown) => ['photos', filters],
  },

  achievements: {
    all: ['achievements'],
    unseen: ['achievements', 'unseen'],
  },
} as const
