import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useToast } from '../../src/context/ToastContext'
import { ValidationError } from '../../src/errors/ValidationError'
import { usePhotoPicker } from '../../src/hooks/usePhotoPicker'
import type { useUploadPhoto } from '../../src/hooks/usePhotos'
import type { PlantPhoto } from '../../src/types/plantPhoto'

type UploadMutation = ReturnType<typeof useUploadPhoto>

const mutateAsync = vi.fn<UploadMutation['mutateAsync']>()
const success = vi.fn<ReturnType<typeof useToast>['success']>()
const error = vi.fn<ReturnType<typeof useToast>['error']>()

// usePhotoPicker only calls useUploadPhoto — usePhotos/useDeletePhoto aren't touched by this hook.
vi.mock('../../src/hooks/usePhotos', () => ({
  useUploadPhoto: (): Pick<UploadMutation, 'mutateAsync' | 'isPending'> => ({ mutateAsync, isPending: false }),
}))

// usePhotoPicker only calls toast.success/toast.error.
vi.mock('../../src/context/ToastContext', () => ({
  useToast: (): Pick<ReturnType<typeof useToast>, 'success' | 'error'> => ({ success, error }),
}))

const FILE = new File(['bytes'], 'plant.jpg', { type: 'image/jpeg' })

// The hook builds its own input and appends it to the DOM, so the test
// drives the real element rather than a stub.
function pick(file: File | null) {
  const input = document.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected a file input to be mounted')
  Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true })
  input.dispatchEvent(new Event('change'))
}

describe('usePhotoPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // mutateAsync's resolved photo is never read by usePhotoPicker — only that
    // the promise resolves matters — so the fixture doesn't need a full PlantPhoto.
    mutateAsync.mockResolvedValue({} as PlantPhoto)
  })

  it('uploads the picked file to the plant', async () => {
    const { result } = renderHook(() => usePhotoPicker(7))
    act(() => result.current.openPicker())
    pick(FILE)

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ plantId: 7, file: FILE }))
    await waitFor(() => expect(success).toHaveBeenCalledWith('Photo added'))
  })

  // The server names the rule the file broke; the picker is a button with
  // no field to hang that on, so it has to reach the toast or be lost.
  it('says why the server rejected the photo', async () => {
    mutateAsync.mockRejectedValue(new ValidationError({ image: 'must be smaller than 10MB' }))

    const { result } = renderHook(() => usePhotoPicker(7))
    act(() => result.current.openPicker())
    pick(FILE)

    await waitFor(() => expect(error).toHaveBeenCalledWith("Couldn't upload — that photo must be smaller than 10MB"))
  })

  it('falls back to a generic message when the failure has no reason', async () => {
    mutateAsync.mockRejectedValue(new Error('network is down'))

    const { result } = renderHook(() => usePhotoPicker(7))
    act(() => result.current.openPicker())
    pick(FILE)

    await waitFor(() => expect(error).toHaveBeenCalledWith("Couldn't upload the photo"))
  })

  it('does nothing when the picker is dismissed without a file', async () => {
    const { result } = renderHook(() => usePhotoPicker(7))
    act(() => result.current.openPicker())
    pick(null)

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('does nothing without a plant', () => {
    const { result } = renderHook(() => usePhotoPicker(undefined))
    act(() => result.current.openPicker())

    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
