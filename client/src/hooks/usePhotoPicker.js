import { useCallback } from 'react'
import { useToast } from '../context/ToastContext'
import { ValidationError } from '../errors/ValidationError'
import { useUploadPhoto } from './usePhotos'

// "Tap → pick → upload" for quick-action surfaces (action wheel, peek
// dialog, Photos-tab CTA). Opens the native file/camera picker and
// uploads the chosen image to the plant — no intermediate form, no
// caption. Caption-at-upload would be a later edit feature.
//
// The input is created on demand + appended to the DOM (a detached
// input doesn't reliably open the picker under automation/headless), so
// consumers don't each render a hidden <input>. Removed on change or
// cancel. Playwright drives it via the filechooser event.
export function usePhotoPicker(plantId) {
  const upload = useUploadPhoto()
  const toast = useToast()

  const openPicker = useCallback(() => {
    if (!plantId) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    input.addEventListener('cancel', () => input.remove(), { once: true })
    input.addEventListener(
      'change',
      async () => {
        const file = input.files?.[0]
        input.remove()
        if (!file) return
        try {
          await upload.mutateAsync({ plantId, file })
          toast.success('Photo added')
        } catch (error) {
          // The server says which rule the file broke (wrong type, too
          // big). There's no field to hang that on here — the picker is
          // a button — so it goes in the toast rather than being lost
          // behind "couldn't upload".
          const reason = error instanceof ValidationError ? error.fields.image : null
          toast.error(reason ? `Couldn't upload — that photo ${reason}` : "Couldn't upload the photo")
        }
      },
      { once: true },
    )
    document.body.appendChild(input)
    input.click()
  }, [plantId, upload, toast])

  return { openPicker, isUploading: upload.isPending }
}
