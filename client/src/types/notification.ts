import { z } from 'zod'

// ApplicationNotifier#as_json (Noticed::Notification, notification_methods
// block) — kind is derived from the notifier class name at runtime
// ('care_due_water', 'care_due_feed', 'achievement', ...), not a fixed
// Rails enum, so it stays a free string rather than z.enum.
export const appNotificationSchema = z.object({
  id: z.number(),
  kind: z.string(),
  title: z.string(),
  meta: z.string().nullable(),
  url: z.string().nullable(),
  // jsonb, shape varies per notifier subclass (plant_id/days_overdue for
  // CareDue::*, achievement_id/title/label/emoji/url for Achievement).
  // Column has no NOT NULL / default (noticed_events.params) — every
  // current notifier uses required_param so it's always populated in
  // practice, but the contract doesn't guarantee it.
  params: z.record(z.string(), z.unknown()).nullable(),
  read_at: z.string().nullable(),
  seen_at: z.string().nullable(),
  created_at: z.string(),
})

export type AppNotification = z.infer<typeof appNotificationSchema>

// NotificationsController#index — the drawer feed + bell badge count.
export const notificationsResponseSchema = z.object({
  unread_count: z.number(),
  notifications: z.array(appNotificationSchema),
})

export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>

// NotificationsController#update — mark-one-read response.
export const notificationUpdateResponseSchema = z.object({
  unread_count: z.number(),
  notification: appNotificationSchema,
})

export type NotificationUpdateResponse = z.infer<typeof notificationUpdateResponseSchema>

// NotificationsController#destroy — dismiss response. Same shape as the
// seen sweep: the row is gone, so only the badge has anything to say.
export const notificationDismissResponseSchema = z.object({
  unread_count: z.number(),
})

export type NotificationDismissResponse = z.infer<typeof notificationDismissResponseSchema>

// NotificationsSeenController#create — mark-all-seen response.
export const notificationsSeenResponseSchema = z.object({
  unread_count: z.number(),
})

export type NotificationsSeenResponse = z.infer<typeof notificationsSeenResponseSchema>
