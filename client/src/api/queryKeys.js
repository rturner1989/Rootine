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
    forDate: (date) => (date ? ['dashboard', date] : ['dashboard']),
  },

  plants: {
    all: ['plants'],
    detail: (id) => ['plants', id],
    // Nested under the plant so invalidating one cascades to its logs.
    careLogs: (plantId, careType) => ['plants', plantId, 'careLogs', careType],
  },

  spaces: {
    all: ['spaces'],
    list: (scope) => ['spaces', scope],
    detail: (id) => ['spaces', id],
    presets: ['spaces', 'presets'],
  },

  species: {
    popular: ['species', 'popular'],
    search: (query) => ['species', 'search', query],
    browse: (filters) => ['species', 'browse', filters],
    grouped: (filters) => ['species', 'browse', 'grouped', filters],
    detail: (id) => ['species', id],
  },

  journal: {
    all: ['journal'],
    list: (filters) => ['journal', filters],
    calendar: (from, to, filters) => ['journal', 'calendar', from, to, filters],
  },

  photos: {
    all: ['photos'],
    list: (filters) => ['photos', filters],
  },

  achievements: {
    all: ['achievements'],
    unseen: ['achievements', 'unseen'],
  },
}
