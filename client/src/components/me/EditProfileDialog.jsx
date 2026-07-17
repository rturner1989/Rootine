import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from '../../hooks/useProfile'
import TextInput from '../form/TextInput'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import Medallion from '../ui/Medallion'

const TITLE = 'Edit profile'

export default function EditProfileDialog({ open, onClose, profile }) {
  const toast = useToast()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const removeAvatar = useRemoveAvatar()
  const fileRef = useRef(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  // The picked file is held until save so the dialog can be cancelled —
  // uploading on pick would strand a new avatar behind a Cancel.
  const [pickedFile, setPickedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [clearAvatar, setClearAvatar] = useState(false)

  // Seeds the form once per open. `profile` is deliberately not a
  // dependency: it's a query result, so any refetch — window focus, or
  // another mutation invalidating it — hands back a new object and would
  // re-run this, overwriting whatever the user had typed.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on open, not on profile identity
  useEffect(() => {
    if (!open) return
    setName(profile?.name ?? '')
    setEmail(profile?.email ?? '')
    setPickedFile(null)
    setClearAvatar(false)
  }, [open])

  // Object URLs leak until revoked, and a new one is minted per pick.
  useEffect(() => {
    if (!pickedFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(pickedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pickedFile])

  const shownAvatar = previewUrl ?? (clearAvatar ? null : profile?.avatar_url)
  const initial = name?.[0]?.toUpperCase() ?? '?'

  function handlePick(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPickedFile(file)
    setClearAvatar(false)
  }

  function handleRemove() {
    setPickedFile(null)
    setClearAvatar(true)
  }

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      await updateProfile.mutateAsync({ name, email })
      // Avatar work runs after the profile save so a rejected email
      // doesn't leave a new picture attached to unsaved details.
      if (pickedFile) await updateAvatar.mutateAsync(pickedFile)
      else if (clearAvatar) await removeAvatar.mutateAsync()
    },
    errorMessage: "Couldn't save your profile",
    onSuccess: () => {
      toast.success('Profile updated')
      onClose()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} title={TITLE}>
      <Card.Header divider={false}>
        <p className="text-lg font-extrabold text-ink">{TITLE}</p>
      </Card.Header>

      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Body className="!flex-none flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Medallion className="!w-20 !h-20 !text-3xl shrink-0">
              {shownAvatar ? <img src={shownAvatar} alt="" className="w-full h-full object-cover" /> : initial}
            </Medallion>

            <div className="flex flex-col items-start gap-1.5">
              {/* sr-only keeps the input focusable, which would put an
                  invisible tab stop next to the button that triggers it.
                  The button is the control; this is just the mechanism. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handlePick}
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose a profile picture"
              />
              <Action type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                {shownAvatar ? 'Change photo' : 'Add a photo'}
              </Action>
              {shownAvatar && (
                <Action type="button" variant="ghost" onClick={handleRemove} className="text-xs hover:text-coral-deep">
                  Remove photo
                </Action>
              )}
              {fieldErrors.avatar && <p className="text-xs font-semibold text-coral-deep">{fieldErrors.avatar}</p>}
            </div>
          </div>

          <TextInput
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldErrors.name}
            autoComplete="name"
            required
          />

          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            autoComplete="email"
            required
          />
        </Card.Body>

        <Card.Footer divider={false} className="flex justify-end gap-2.5">
          <Action type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Action>
          <Action type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Action>
        </Card.Footer>
      </form>
    </Dialog>
  )
}
