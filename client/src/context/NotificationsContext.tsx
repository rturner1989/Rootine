import type { Subscription } from '@rails/actioncable'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cableConsumer } from '../api/cable'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../hooks/useAuth'

type NotificationsContextValue = {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const subscriptionRef = useRef<Subscription | null>(null)
  const subscribedUserRef = useRef<number | null>(null)

  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])

  // No unsubscribe-in-cleanup — see AchievementsListener for the
  // rationale. StrictMode's sub→unsub→resub cycle drops the redis
  // adapter's refcount, leaving the resubscribed channel without a
  // backing pub/sub subscriber, so Sidekiq broadcasts vanish.
  // Subscription dies with the consumer on logout (disconnectCable in
  // AuthContext). User-id changes tear down the prior subscription
  // explicitly before re-subscribing for the new user.
  useEffect(() => {
    if (!userId) return
    if (subscribedUserRef.current === userId) return

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    const consumer = cableConsumer()
    subscriptionRef.current = consumer.subscriptions.create('NotificationsChannel', {
      received: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    })
    subscribedUserRef.current = userId
  }, [userId, queryClient])

  const value = useMemo(() => ({ open, openDrawer, closeDrawer }), [open, openDrawer, closeDrawer])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
