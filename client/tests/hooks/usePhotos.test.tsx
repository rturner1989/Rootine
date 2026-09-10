import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { request } from '../../src/api/client'
import { useDeletePhoto, usePhotos, useUploadPhoto } from '../../src/hooks/usePhotos'
import type { PhotoFeedItem, PhotoFeedResponse, PlantPhoto } from '../../src/types/plantPhoto'
import { plantPhotoSchema } from '../../src/types/plantPhoto'

vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

const mockedRequest = vi.mocked(request)

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function lastRequestedUrl(): string {
  return (mockedRequest.mock.calls.at(-1)?.[0] as string) ?? ''
}

// photoFeedItemSchema requires the full PhotoFeed#payload shape.
function photoFixture(overrides: Partial<PhotoFeedItem> = {}): PhotoFeedItem {
  return {
    id: 1,
    image_url: 'https://example.com/photo.jpg',
    caption: null,
    taken_at: '2026-05-10T12:00:00.000Z',
    plant: { id: 7, nickname: 'Wilty' },
    ...overrides,
  }
}

describe('usePhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches /api/v1/photos with the default limit', async () => {
    mockedRequest.mockResolvedValue({ photos: [], next_cursor: null } satisfies PhotoFeedResponse)
    const { result } = renderHook(() => usePhotos(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('/api/v1/photos?')
    expect(lastRequestedUrl()).toContain('limit=30')
    expect(lastRequestedUrl()).not.toContain('plant_ids')
  })

  it('scopes to plants when plantIds are given', async () => {
    mockedRequest.mockResolvedValue({ photos: [], next_cursor: null } satisfies PhotoFeedResponse)
    const { result } = renderHook(() => usePhotos({ plantIds: [42] }), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('plant_ids=42')
  })

  it('passes the date range as date_from and date_to', async () => {
    mockedRequest.mockResolvedValue({ photos: [], next_cursor: null } satisfies PhotoFeedResponse)
    const { result } = renderHook(() => usePhotos({ dateFrom: '2026-05-01', dateTo: '2026-05-20' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('date_from=2026-05-01')
    expect(lastRequestedUrl()).toContain('date_to=2026-05-20')
  })

  it('passes next_cursor as `before` on fetchNextPage', async () => {
    mockedRequest
      .mockResolvedValueOnce({ photos: [photoFixture()], next_cursor: '2026-05-10T12:00:00.000Z' } satisfies PhotoFeedResponse)
      .mockResolvedValueOnce({ photos: [], next_cursor: null } satisfies PhotoFeedResponse)

    const { result } = renderHook(() => usePhotos(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    result.current.fetchNextPage()

    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(2))
    expect(lastRequestedUrl()).toContain('before=2026-05-10T12%3A00%3A00.000Z')
  })

  it('exposes hasNextPage=false when the server returns a null cursor', async () => {
    mockedRequest.mockResolvedValue({ photos: [], next_cursor: null } satisfies PhotoFeedResponse)
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
    mockedRequest.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeletePhoto(), { wrapper: makeWrapper() })

    result.current.mutate({ plantId: 7, photoId: 3 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedRequest).toHaveBeenCalledWith('/api/v1/plants/7/plant_photos/3', z.void(), { method: 'DELETE' })
  })
})

describe('useUploadPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POSTs FormData to the nested per-plant photo route', async () => {
    mockedRequest.mockResolvedValue({
      id: 9,
      caption: null,
      taken_at: '2026-05-10T12:00:00.000Z',
      image_url: null,
      created_at: '2026-05-10T12:00:00.000Z',
    } satisfies PlantPhoto)
    const { result } = renderHook(() => useUploadPhoto(), { wrapper: makeWrapper() })

    // useUploadPhoto's mutationFn declares `file: File` — a File, not a bare
    // Blob, matches the real parameter type; FormData.append accepts either
    // at runtime, so this doesn't change what the assertions below check.
    result.current.mutate({ plantId: 7, file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedRequest).toHaveBeenCalledWith('/api/v1/plants/7/plant_photos', plantPhotoSchema, {
      method: 'POST',
      body: expect.any(FormData),
    })
  })
})
