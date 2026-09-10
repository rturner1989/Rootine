import type { Subscription } from '@rails/actioncable'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { cableConsumer } from '../api/cable'
import { queryKeys } from '../api/queryKeys'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { achievementSchema } from '../types/achievement'

// Mounted inside the ToastProvider tree so it can fire toasts on
// achievement broadcasts. Subscribes to AchievementsChannel for the
// authenticated user; cable consumer singleton is shared with
// NotificationsProvider (one underlying connection, two channels).
//
// No unsubscribe-in-cleanup — StrictMode's mount/cleanup/mount cycle
// triggers a sub→unsub→resub on the wire, and Action Cable's redis
// adapter drops the refcount to 0 between the unsub and the resub,
// stranding the second subscription without an underlying redis
// pub/sub subscriber. Broadcasts from Sidekiq then land in the void.
// We hold the subscription for the lifetime of the consumer, which is
// destroyed on logout via disconnectCable() in AuthContext.
export default function AchievementsListener() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const toast = useToast()
  const subscriptionRef = useRef<Subscription | null>(null)
  const subscribedUserRef = useRef<number | null>(null)
  const receivedRef = useRef<((achievement: unknown) => void) | null>(null)
  const [connected, setConnected] = useState(false)

  // Latest received-handler in a ref so the subscription's callback
  // always reads fresh closures (toast / queryClient) without us
  // having to recreate the subscription on every render.
  //
  // The broadcast is treated as a signal, not a trusted payload — a
  // schema mismatch here must never take out invalidateQueries with it,
  // or the bell/achievements list stop refreshing along with the toast.
  // The REST-backed unseen/achievements fetches (already schema-checked)
  // stay the source of truth either way.
  receivedRef.current = (payload: unknown) => {
    const result = achievementSchema.safeParse(payload)
    if (result.success) {
      const achievement = result.data
      toast.success({
        title: 'Achievement unlocked',
        meta: `${achievement.emoji} ${achievement.label}`,
        duration: 6000,
      })
    } else {
      console.error('AchievementsListener: malformed AchievementsChannel broadcast', result.error, payload)
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all })
  }

  useEffect(() => {
    if (!userId) return
    if (subscribedUserRef.current === userId) return

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    const consumer = cableConsumer()
    subscriptionRef.current = consumer.subscriptions.create('AchievementsChannel', {
      connected: () => setConnected(true),
      disconnected: () => setConnected(false),
      received: (achievement) => receivedRef.current?.(achievement),
    })
    subscribedUserRef.current = userId
  }, [userId])

  // Hidden readiness marker — flips once the server has confirmed the
  // AchievementsChannel subscription. Action Cable doesn't replay missed
  // broadcasts, so the Playwright e2e specs wait on this before triggering
  // an unlock via Rails runner; without it, a fast CI worker can fire the
  // broadcast before the subscribe round-trip finishes and the toast is
  // permanently lost.
  return connected ? <span data-testid="achievements-cable-ready" hidden /> : null
}
