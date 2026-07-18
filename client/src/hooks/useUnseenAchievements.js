import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from './useAuth'

// Splash queue — pulls splash-surface achievements (login_streak_*)
// that haven't been marked seen yet. Login achievements skip the cable
// broadcast (subscription isn't ready at login time), so the client
// fetches them on AppLayout mount and renders an overlay.
export function useUnseenAchievements() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.achievements.unseen,
    queryFn: () => apiGet('/api/v1/achievements/unseen'),
    enabled: Boolean(user),
    staleTime: 0,
  })

  const markSeen = useMutation({
    mutationFn: (id) => apiPatch(`/api/v1/achievements/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.unseen })
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all })
    },
  })

  return {
    achievements: query.data?.achievements ?? [],
    isLoading: query.isLoading,
    markSeen: markSeen.mutate,
  }
}
