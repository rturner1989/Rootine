// Single home for the app's TanStack Query keys, so a resource's cache
// identity is written once and every reader/invalidator shares it.
//
// Profile lives here now because it's read by AuthContext and
// invalidated from several mutations, and was drifting between
// duplicate declarations. The remaining keys (plants, dashboard,
// journal, spaces, notifications, species) are still inline at their
// hooks and migrate here in a follow-up.
//
// Keys stay flat array tuples per the project cache-key convention —
// never nested arrays.
export const queryKeys = {
  profile: ['profile'],
}
