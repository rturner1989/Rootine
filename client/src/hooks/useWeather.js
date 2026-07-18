import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/queryKeys'

// Pulls forecast from Rails proxy of Open-Meteo. Server caches results
// 30 min per coordinate pair (rounded to 2 decimals); hook adds another
// staleTime to skip refetches while user moves around the app. Returns
// the same shape the Organiser/Today widgets already consume:
//   { today: { scheme, icon, label, detail, temperature },
//     week:  [{ date, scheme, icon, label, temperature }, ...],
//     locationLabel }
export function useWeather() {
  const query = useQuery({
    queryKey: queryKeys.weather,
    queryFn: () => apiGet('/api/v1/weather'),
    staleTime: 1000 * 60 * 15,
  })

  return {
    today: query.data?.today ?? null,
    week: query.data?.week ?? [],
    locationLabel: query.data?.location_label ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
