import Badge from '../ui/Badge'

type QueryChipProps = {
  query: string
  onClear: () => void
}

export default function QueryChip({ query, onClear }: QueryChipProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-softer">Searching</span>
      <Badge scheme="emerald" variant="soft" size="md" onClear={onClear} clearLabel="Clear search">
        <span className="truncate max-w-[200px]">“{query}”</span>
      </Badge>
    </div>
  )
}
