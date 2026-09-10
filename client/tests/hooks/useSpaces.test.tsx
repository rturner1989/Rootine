import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { request } from '../../src/api/client'
import { useCreateSpace, useDeleteSpace, useSpacePresets, useSpaces } from '../../src/hooks/useSpaces'
import type { Space } from '../../src/types/space'
import { spacePresetSchema, spaceSchema } from '../../src/types/space'

// vi.mock is hoisted above the import, so `request` resolves to this
// mock when the hook module imports it.
vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

const mockedRequest = vi.mocked(request)

// spaceSchema requires every field — Space#as_json's full column set.
function spaceFixture(overrides: Partial<Space> = {}): Space {
  return {
    id: 1,
    name: 'Kitchen',
    icon: 'kitchen',
    category: 'indoor',
    light_level: 'medium',
    temperature_level: 'average',
    humidity_level: 'average',
    archived_at: null,
    plants_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// Fresh QueryClient per test so cache state doesn't leak across cases.
// retry: false so failed queries surface immediately instead of burning
// 10s on the default 3-retry backoff.
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSpaces hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useSpaces()', () => {
    it('fetches /api/v1/spaces by default', async () => {
      mockedRequest.mockResolvedValue([spaceFixture()])
      const { result } = renderHook(() => useSpaces(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockedRequest).toHaveBeenCalledWith('/api/v1/spaces', z.array(spaceSchema))
      expect(result.current.data).toEqual([spaceFixture()])
    })

    it('skips the fetch when enabled is false', async () => {
      const { result } = renderHook(() => useSpaces({ enabled: false }), { wrapper: makeWrapper() })

      // With enabled:false, TanStack keeps the observer idle — fetchStatus
      // stays 'idle' and the queryFn never runs.
      expect(result.current.fetchStatus).toBe('idle')
      expect(mockedRequest).not.toHaveBeenCalled()
    })
  })

  describe('useSpacePresets()', () => {
    it('fetches /api/v1/spaces/presets', async () => {
      mockedRequest.mockResolvedValue([{ name: 'Kitchen', icon: 'kitchen', category: 'indoor' }])
      const { result } = renderHook(() => useSpacePresets(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockedRequest).toHaveBeenCalledWith('/api/v1/spaces/presets', z.array(spacePresetSchema))
    })
  })

  // These lock the cache-key contract between the list query and the
  // mutations. If someone renames useSpaces' queryKey but forgets to update
  // invalidateQueries, these fail — otherwise the drift is silent.
  describe('cache invalidation contract', () => {
    it('useCreateSpace refreshes useSpaces after a successful create', async () => {
      const created = spaceFixture({ id: 1, name: 'New Space' })
      mockedRequest.mockResolvedValueOnce([]).mockResolvedValueOnce(created).mockResolvedValueOnce([created])

      const { result } = renderHook(() => ({ spaces: useSpaces(), create: useCreateSpace() }), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.spaces.data).toEqual([]))

      await act(async () => {
        await result.current.create.mutateAsync({ name: 'New Space', icon: null })
      })

      expect(mockedRequest).toHaveBeenCalledWith('/api/v1/spaces', spaceSchema, {
        method: 'POST',
        body: JSON.stringify({ space: { name: 'New Space', icon: null } }),
      })
      await waitFor(() => expect(result.current.spaces.data).toEqual([created]))
    })

    it('useDeleteSpace refreshes useSpaces after a successful delete', async () => {
      mockedRequest.mockResolvedValueOnce([spaceFixture()]).mockResolvedValueOnce(undefined).mockResolvedValueOnce([])

      const { result } = renderHook(() => ({ spaces: useSpaces(), deleteSpace: useDeleteSpace() }), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.spaces.data).toEqual([spaceFixture()]))

      await act(async () => {
        await result.current.deleteSpace.mutateAsync(1)
      })

      expect(mockedRequest).toHaveBeenCalledWith('/api/v1/spaces/1', z.void(), { method: 'DELETE' })
      await waitFor(() => expect(result.current.spaces.data).toEqual([]))
    })
  })
})
