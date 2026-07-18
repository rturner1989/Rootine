import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/queryKeys'

// Pulls earned achievements from the server. Backend orders by
// earned_at desc and limits to 20. Returns the same wrapper shape as
// other widget hooks for consistency.
export function useAchievements() {
  const query = useQuery({
    queryKey: queryKeys.achievements.all,
    queryFn: () => apiGet('/api/v1/achievements'),
    staleTime: 1000 * 60,
  })

  return {
    achievements: query.data?.achievements ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
