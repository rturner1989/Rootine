// Canonical look for each family of notification — the drawer groups by
// these, and the Me page's preference rows reuse them so the switch that
// silences a family looks like the family it silences.
//
// `kinds` are the `kind` values ApplicationNotifier emits. Each family
// maps 1:1 onto a users.notify_* column today; a family without a
// preference column simply can't be turned off.
export const NOTIFICATION_FAMILIES = {
  care: {
    label: 'Care',
    icon: '💧',
    tint: 'bg-sky/20 text-sky-deep',
    kinds: ['care_due_water', 'care_due_feed'],
  },
  achievement: {
    label: 'Achievements',
    icon: '🏆',
    tint: 'bg-sunshine/20 text-sunshine-deep',
    kinds: ['achievement'],
  },
}
