// Canonical care-dot vocabulary — colour by kind, shape by variant.
// Logged = filled (done), scheduled = hollow ring (planned), overdue =
// coral + pulse (missed; its own colour, not the kind's). The single
// source of care colours across every calendar-ish surface: journal
// month grid + toolbar legend AND Today's week strip (which reads the
// DOT_FILL colours for its per-day task-count dots).
export const DOT_FILL = { water: 'bg-water', feed: 'bg-leaf', photo: 'bg-coral', milestone: 'bg-sunshine' }
export const DOT_RING = { water: 'border-water', feed: 'border-leaf' }
export const DOT_LABEL = { water: 'Water', feed: 'Feed', photo: 'Photo', milestone: 'Milestone' }

export function dotClass({ kind, variant }) {
  if (variant === 'logged') return `h-2 w-2 rounded-full ${DOT_FILL[kind]}`
  if (variant === 'overdue') return 'h-2 w-2 rounded-full bg-coral-deep cal-dot-overdue'
  return `h-2 w-2 rounded-full border-[1.5px] ${DOT_RING[kind]}`
}
