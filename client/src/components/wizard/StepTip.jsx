export default function StepTip({ icon, children }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-mint/40 text-[13px] text-left">
      {icon && (
        <span aria-hidden="true" className="text-base leading-none mt-px">
          {icon}
        </span>
      )}
      <span className="font-display italic text-ink-soft leading-snug">{children}</span>
    </div>
  )
}
