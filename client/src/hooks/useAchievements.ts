import { useQuery } from '@tanstack/react-query'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { achievementsResponseSchema } from '../types/achievement'

// Pulls earned achievements from the server. Backend orders by
// earned_at desc and limits to 20. Returns the same wrapper shape as
// other widget hooks for consistency.
export function useAchievements() {
  const query = useQuery({
    queryKey: queryKeys.achievements.all,
    queryFn: () => request('/api/v1/achievements', achievementsResponseSchema),
    staleTime: 1000 * 60,
  })

  return {
    achievements: query.data?.achievements ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
