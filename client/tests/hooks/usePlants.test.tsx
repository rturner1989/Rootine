import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { act, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreatePlant, useDeletePlant, useLogCare, useUpdatePlant } from '../../src/hooks/usePlants'

// These mutation hooks only read `request` — the resolved payload is
// unused by this suite, which only asserts on invalidateQueries calls.
vi.mock('../../src/api/client', () => ({
  request: vi.fn().mockResolvedValue({}),
}))

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
})

// The Me page's stats (care-log count, streak, vitality, plant count)
// live on the ['profile'] cache, which is stale unless the mutations that
// change those aggregates invalidate it — the bug being: water a plant,
// go to Me, stats unchanged until reload.
function invalidatesProfile<Args extends unknown[], Variables>(
  useHook: (...args: Args) => { mutateAsync: (variables: Variables) => Promise<unknown> },
  callArgs: Args,
  mutateArg: Variables,
) {
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
  it(
    'useCreatePlant — a new plant moves the count',
    invalidatesProfile(useCreatePlant, [], { nickname: 'Fern', space_id: 1 }),
  )
  it('useDeletePlant — removal moves the count', invalidatesProfile(useDeletePlant, [], 1))
  it('useUpdatePlant — rescheduling moves vitality', invalidatesProfile(useUpdatePlant, [], { id: 1, space_id: 2 }))
})

// The server marks a plant's care-due notification read whenever its care
// anchor moves — through a care log, or through Edit Plant. Neither
// resolution is broadcast, so the bell keeps its stale "N days overdue" row
// until these mutations invalidate the cache.
function invalidatesNotifications<Args extends unknown[], Variables>(
  useHook: (...args: Args) => { mutateAsync: (variables: Variables) => Promise<unknown> },
  callArgs: Args,
  mutateArg: Variables,
) {
  return async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useHook(...callArgs), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(mutateArg)
    })

    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['notifications'] })))
  }
}

describe('clearing a care-due notification refreshes the bell', () => {
  it(
    'useLogCare — watering resolves the notification',
    invalidatesNotifications(useLogCare, [1], { care_type: 'water' }),
  )
  it(
    'useUpdatePlant — moving the care anchor resolves it too',
    invalidatesNotifications(useUpdatePlant, [], { id: 1, space_id: 2, last_watered_at: '2026-09-11' }),
  )
})
