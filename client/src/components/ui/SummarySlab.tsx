import type { HTMLAttributes } from 'react'

// Fixed-height slab pattern — every Row carries the same min-height so
// the dashed divider sits at the same Y across a grid of cards. Locked
// per project_v2_design_decisions.md: 62px desktop / 34px mobile.

export type SummarySlabProps = HTMLAttributes<HTMLDivElement>

function SummarySlab({ children, className = '', ...kwargs }: SummarySlabProps) {
  return (
    <div className={`flex flex-col ${className}`} {...kwargs}>
      {children}
    </div>
  )
}

export type SummarySlabRowProps = HTMLAttributes<HTMLDivElement>

function Row({ children, className = '', ...kwargs }: SummarySlabRowProps) {
  return (
    <div
      className={`flex items-center min-h-[34px] lg:min-h-[62px] [&:not(:first-child)]:border-t [&:not(:first-child)]:border-dashed [&:not(:first-child)]:border-paper-edge ${className}`}
      {...kwargs}
    >
      {children}
    </div>
  )
}

export default Object.assign(SummarySlab, { Row })
