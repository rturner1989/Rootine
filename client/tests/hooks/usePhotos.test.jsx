import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiDelete, apiGet, apiPost } from '../../src/api/client'
import { useDeletePhoto, usePhotos, useUploadPhoto } from '../../src/hooks/usePhotos'

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  apiPost: vi.fn(),
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function lastRequestedUrl() {
  return apiGet.mock.calls.at(-1)?.[0] ?? ''
}

describe('usePhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches /api/v1/photos with the default limit', async () => {
    apiGet.mockResolvedValue({ photos: [], next_cursor: null })
    const { result } = renderHook(() => usePhotos(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('/api/v1/photos?')
    expect(lastRequestedUrl()).toContain('limit=30')
    expect(lastRequestedUrl()).not.toContain('plant_ids')
  })

  it('scopes to plants when plantIds are given', async () => {
    apiGet.mockResolvedValue({ photos: [], next_cursor: null })
    const { result } = renderHook(() => usePhotos({ plantIds: [42] }), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('plant_ids=42')
  })

  it('passes the date range as date_from and date_to', async () => {
    apiGet.mockResolvedValue({ photos: [], next_cursor: null })
    const { result } = renderHook(() => usePhotos({ dateFrom: '2026-05-01', dateTo: '2026-05-20' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('date_from=2026-05-01')
    expect(lastRequestedUrl()).toContain('date_to=2026-05-20')
  })

  it('passes next_cursor as `before` on fetchNextPage', async () => {
    apiGet
      .mockResolvedValueOnce({ photos: [{ id: 1 }], next_cursor: '2026-05-10T12:00:00.000Z' })
      .mockResolvedValueOnce({ photos: [], next_cursor: null })

    const { result } = renderHook(() => usePhotos(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    result.current.fetchNextPage()

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2))
    expect(lastRequestedUrl()).toContain('before=2026-05-10T12%3A00%3A00.000Z')
  })

  it('exposes hasNextPage=false when the server returns a null cursor', async () => {
    apiGet.mockResolvedValue({ photos: [], next_cursor: null })
    const { result } = renderHook(() => usePhotos(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })
})

describe('useDeletePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DELETEs the nested per-plant photo route', async () => {
    apiDelete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeletePhoto(), { wrapper: makeWrapper() })

    result.current.mutate({ plantId: 7, photoId: 3 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiDelete).toHaveBeenCalledWith('/api/v1/plants/7/plant_photos/3')
  })
})

describe('useUploadPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POSTs FormData to the nested per-plant photo route', async () => {
    apiPost.mockResolvedValue({ id: 9 })
    const { result } = renderHook(() => useUploadPhoto(), { wrapper: makeWrapper() })

    result.current.mutate({ plantId: 7, file: new Blob(['x'], { type: 'image/jpeg' }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiPost).toHaveBeenCalledWith('/api/v1/plants/7/plant_photos', expect.any(FormData))
  })
})
