import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/queryKeys'

// Optional ISO date (YYYY-MM-DD) drives the rituals payload — passing
// a future date previews tasks scheduled on/before that day. Omit for
// today's view. keepPreviousData stops the rituals card flashing
// empty during the refetch when the user picks another calendar day.
export function useDashboard(date) {
  const url = date ? `/api/v1/dashboard?date=${date}` : '/api/v1/dashboard'
  const queryKey = queryKeys.dashboard.forDate(date)

  return useQuery({
    queryKey,
    queryFn: () => apiGet(url),
    placeholderData: keepPreviousData,
  })
}
