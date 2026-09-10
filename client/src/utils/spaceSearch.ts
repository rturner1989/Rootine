// House search returns spaces. A space matches the query if its own
// name matches, OR if it contains a plant whose nickname or species
// matches. Plant matches surface their parent space — there's no
// dedicated plants page yet (Phase 2), so the space is the canonical
// landing point for any match on the House screen.

import type { Plant } from '../types/plant'
import type { Space } from '../types/space'

export function spaceMatchesQuery(space: Space, plants: Plant[], query?: string | null): boolean {
  if (!query) return true
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (space.name?.toLowerCase().includes(q)) return true
  return plants.some(
    (plant) =>
      plant.space?.id === space.id &&
      (plant.nickname?.toLowerCase().includes(q) || plant.species?.common_name?.toLowerCase().includes(q)),
  )
}
