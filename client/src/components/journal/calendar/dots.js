// Dot presentation for the calendar — colour by kind, shape by variant.
// Logged = filled (done), scheduled = hollow ring (planned), overdue =
// coral + pulse (missed; its own colour, not the kind's). Shared by the
// month grid cells and the toolbar legend.
export const DOT_FILL = { water: 'bg-water', feed: 'bg-leaf', photo: 'bg-coral', milestone: 'bg-sunshine' }
export const DOT_RING = { water: 'border-water', feed: 'border-leaf' }
export const DOT_LABEL = { water: 'Water', feed: 'Feed', photo: 'Photo', milestone: 'Milestone' }

export function dotClass({ kind, variant }) {
  if (variant === 'logged') return `h-2 w-2 rounded-full ${DOT_FILL[kind]}`
  if (variant === 'overdue') return 'h-2 w-2 rounded-full bg-coral-deep cal-dot-overdue'
  return `h-2 w-2 rounded-full border-[1.5px] ${DOT_RING[kind]}`
}
