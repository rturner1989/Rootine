import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { useDeleteAccount } from '../../hooks/useProfile'
import TextInput from '../form/TextInput'
import ConfirmDialog from '../ui/ConfirmDialog'

// Mirrors DeletePlantDialog, with the password standing in for its
// type-the-name gate — the server re-authenticates the delete, so the
// same field that guards it is the one that unlocks the button.
export default function DeleteAccountDialog({ open, onClose, profile }) {
  const toast = useToast()
  const { logout } = useAuth()
  const deleteAccount = useDeleteAccount()
  const passwordRef = useRef(null)

  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
    }
  }, [open])

  async function handleConfirm() {
    if (!password) return
    try {
      await deleteAccount.mutateAsync({ currentPassword: password })
      // Tears down the token, cable and cache. The session is already
      // dead server-side; this stops the client acting like it isn't.
      await logout()
      toast.success('Your account has been deleted')
    } catch (caught) {
      setError(caught.status === 422 ? 'That password is incorrect' : "Couldn't delete your account — try again")
      throw caught
    }
  }

  const stats = profile?.stats

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Delete account"
      destructive
      confirmLabel="Delete my account"
      loadingLabel="Deleting…"
      loading={deleteAccount.isPending}
      confirmDisabled={!password}
      initialFocusRef={passwordRef}
    >
      <p className="text-sm text-ink leading-relaxed">
        This deletes your account and everything in it — permanently, with no way back.
      </p>

      {stats && (
        <ul className="rounded-md bg-paper-deep/40 border border-paper-edge/40 px-3 py-2 flex flex-col gap-1">
          <li className="text-xs text-ink-soft">
            <strong className="font-bold text-ink">{stats.plants_count}</strong> plants, and every space they live in
          </li>
          <li className="text-xs text-ink-soft">
            <strong className="font-bold text-ink">{stats.care_logs_count}</strong> care logs, plus your journal and
            photos
          </li>
        </ul>
      )}

      <TextInput
        ref={passwordRef}
        label="Enter your password to confirm"
        type="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
          setError(null)
        }}
        error={error}
        autoComplete="current-password"
      />
    </ConfirmDialog>
  )
}
