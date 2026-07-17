import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreatePlant, useDeletePlant, useLogCare, useUpdatePlant } from '../../src/hooks/usePlants'

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn().mockResolvedValue({}),
  apiPatch: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue({}),
}))

let queryClient

function wrapper({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
})

// The Me page's stats (care-log count, streak, vitality, plant count)
// live on the ['profile'] cache, which is stale unless the mutations that
// change those aggregates invalidate it — the bug being: water a plant,
// go to Me, stats unchanged until reload.
function invalidatesProfile(useHook, callArgs, mutateArg) {
  return async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useHook(...callArgs), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(mutateArg)
    })

    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['profile'] })))
  }
}

describe('plant mutations invalidate the profile stats', () => {
  it(
    'useLogCare — watering moves streak, count and vitality',
    invalidatesProfile(useLogCare, [1], { care_type: 'water' }),
  )
  it('useCreatePlant — a new plant moves the count', invalidatesProfile(useCreatePlant, [], { nickname: 'Fern' }))
  it('useDeletePlant — removal moves the count', invalidatesProfile(useDeletePlant, [], 1))
  it(
    'useUpdatePlant — rescheduling moves vitality',
    invalidatesProfile(useUpdatePlant, [], { id: 1, light_level: 'low' }),
  )
})
