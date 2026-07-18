import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiPatch } from '../../api/client'
import { queryKeys } from '../../api/queryKeys'
import { useToast } from '../../context/ToastContext'
import Action from '../ui/Action'

// Resolves browser geolocation → POSTs to /profile → invalidates the
// weather cache so the next fetch uses real coordinates.
export default function LocationButton() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [pending, setPending] = useState(false)

  const mutation = useMutation({
    mutationFn: ({ latitude, longitude }) =>
      apiPatch('/api/v1/profile', {
        user: { latitude, longitude, location_label: 'Your location' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weather })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      toast.success('Location updated')
    },
    onError: () => {
      toast.error("Couldn't save location — try again")
    },
  })

  function handleClick() {
    if (!('geolocation' in navigator)) {
      toast.error("Your browser doesn't support location")
      return
    }

    // Browsers refuse geolocation on insecure origins (anything but HTTPS
    // or localhost) — getCurrentPosition would fire PERMISSION_DENIED with
    // no prompt, which reads as a user denial. Name the real reason.
    if (!window.isSecureContext) {
      toast.warn('Location needs a secure (HTTPS) connection')
      return
    }

    setPending(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPending(false)
        mutation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        setPending(false)
        if (error.code === error.PERMISSION_DENIED) {
          toast.warn('Location denied — using default')
        } else {
          toast.error("Couldn't get your location")
        }
      },
      { timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const busy = pending || mutation.isPending

  return (
    <Action
      variant="unstyled"
      onClick={handleClick}
      disabled={busy}
      aria-label="Use my location"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold text-emerald hover:bg-mint/60 transition-colors disabled:opacity-60"
    >
      <FontAwesomeIcon icon={faLocationDot} className="w-3 h-3" />
      {busy ? 'Locating…' : 'Use my location'}
    </Action>
  )
}
