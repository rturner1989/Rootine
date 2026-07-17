import IconDisc from '../ui/IconDisc'

// One settings line: icon, title, supporting meta, and a trailing
// control. Rows divide from each other rather than carrying their own
// chrome, so a card of them reads as one list.
//
// `metaId` lets the control point at the meta with aria-describedby —
// otherwise tabbing straight to the switch announces the title alone and
// skips the sentence explaining what it does.
export default function SettingRow({ icon, tint, title, meta, metaId, children }) {
  return (
    <div className="flex items-center gap-3 py-3 border-t border-paper-edge first:border-t-0 first:pt-1.5">
      <IconDisc size="sm" tint={tint}>
        {icon}
      </IconDisc>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-bold text-ink">{title}</span>
        {meta && (
          <span id={metaId} className="block text-[11px] font-semibold text-ink-soft leading-snug mt-0.5">
            {meta}
          </span>
        )}
      </span>
      {children}
    </div>
  )
}
