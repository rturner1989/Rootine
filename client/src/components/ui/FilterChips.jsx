import Action from './Action'
import Badge from './Badge'

// Active-filter chips + Clear all. Takes descriptors rather than reading
// any domain state, so the journal's plant thumbnails and the
// encyclopedia's trait chips render through the same control.
export default function FilterChips({ chips, onClearAll }) {
  if (!chips.length) return null

  return (
    <>
      {chips.map((chip) => (
        <Badge key={chip.key} scheme="emerald" size="sm" onClear={chip.onClear} clearLabel={chip.clearLabel}>
          {chip.icon}
          <span className="truncate max-w-[140px]">{chip.label}</span>
        </Badge>
      ))}

      <Action
        variant="unstyled"
        type="button"
        onClick={onClearAll}
        className="text-[11px] font-bold text-ink-softer underline decoration-dotted hover:text-coral-deep"
      >
        Clear all
      </Action>
    </>
  )
}
