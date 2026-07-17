import { useState } from 'react'
import ChangePasswordDialog from '../components/me/ChangePasswordDialog'
import DangerZone from '../components/me/DangerZone'
import DeleteAccountDialog from '../components/me/DeleteAccountDialog'
import EditProfileDialog from '../components/me/EditProfileDialog'
import Hero from '../components/me/Hero'
import NotificationsCard from '../components/me/NotificationsCard'
import StatStrip from '../components/me/StatStrip'
import Action from '../components/ui/Action'
import ErrorState from '../components/ui/errors/ErrorState'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../context/ToastContext'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'

export default function Me() {
  const { data: profile, isLoading, error, refetch } = useProfile()
  const updateProfile = useUpdateProfile()
  const toast = useToast()
  const [openDialog, setOpenDialog] = useState(null)

  // Saving is silent and its effect lives in another surface (the bell),
  // so confirm the change here. On failure the cache refetch snaps the
  // switch back by itself, which otherwise reads as the tap not landing.
  function handlePreferenceChange(field, value, label) {
    updateProfile.mutate(
      { [field]: value },
      {
        onSuccess: () => toast.success(value ? `${label} on` : `${label} hidden`),
        onError: () => toast.error("Couldn't save that — try again"),
      },
    )
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading your settings"
        className="flex-1 flex items-center justify-center min-h-dvh"
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        scheme="500"
        title={
          <>
            Couldn't load your <em>settings</em>
          </>
        }
        description="We couldn't fetch your profile. Try again, or head back home."
        actions={[
          <Action key="retry" type="button" variant="primary" onClick={() => refetch()}>
            Try again
          </Action>,
        ]}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 px-3 lg:px-6 py-4 lg:py-6">
      <Hero profile={profile} onEdit={() => setOpenDialog('profile')} />
      <StatStrip stats={profile?.stats} />

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <NotificationsCard profile={profile} onChange={handlePreferenceChange} />
      </div>

      <DangerZone onChangePassword={() => setOpenDialog('password')} onDeleteAccount={() => setOpenDialog('delete')} />

      <EditProfileDialog open={openDialog === 'profile'} onClose={() => setOpenDialog(null)} profile={profile} />
      <ChangePasswordDialog open={openDialog === 'password'} onClose={() => setOpenDialog(null)} />
      <DeleteAccountDialog open={openDialog === 'delete'} onClose={() => setOpenDialog(null)} profile={profile} />
    </div>
  )
}
