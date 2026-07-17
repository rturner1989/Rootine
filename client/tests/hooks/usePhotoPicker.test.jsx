import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '../../src/errors/ValidationError'
import { usePhotoPicker } from '../../src/hooks/usePhotoPicker'

const mutateAsync = vi.fn()
const success = vi.fn()
const error = vi.fn()

vi.mock('../../src/hooks/usePhotos', () => ({
  useUploadPhoto: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('../../src/context/ToastContext', () => ({
  useToast: () => ({ success, error }),
}))

const FILE = new File(['bytes'], 'plant.jpg', { type: 'image/jpeg' })

// The hook builds its own input and appends it to the DOM, so the test
// drives the real element rather than a stub.
function pick(file) {
  const input = document.querySelector('input[type="file"]')
  Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true })
  input.dispatchEvent(new Event('change'))
}

describe('usePhotoPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutateAsync.mockResolvedValue({})
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
    const { result } = renderHook(() => usePhotoPicker(null))
    act(() => result.current.openPicker())

    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
