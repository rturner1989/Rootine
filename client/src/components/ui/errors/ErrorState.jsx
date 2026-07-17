import { useEffect, useRef } from 'react'
import Medallion from '../Medallion'

const MEDALLION_TEXT = { 404: '404', 500: '!' }

const MEDALLION_SCHEME = { 404: 'paper', 500: 'danger' }

export default function ErrorState({
  scheme = '404',
  title,
  description,
  actions,
  headingLevel = 'h1',
  className = '',
}) {
  const Heading = headingLevel
  const actionsRef = useRef(null)

  // Focus the primary recovery action (first focusable in the actions
  // row) on mount so keyboard users can Enter to escape immediately.
  // Query rather than ref-forwarding so consumers can pass any element
  // (Action, plain button, Link) without ceremony.
  useEffect(() => {
    if (!actionsRef.current) return
    const frame = requestAnimationFrame(() => {
      const focusable = actionsRef.current?.querySelector('a, button, [tabindex]:not([tabindex="-1"])')
      focusable?.focus?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const actionList = Array.isArray(actions) ? actions.filter(Boolean) : actions ? [actions] : []

  return (
    <div
      className={`relative flex flex-col flex-1 items-center justify-center text-center px-6 py-12 gap-4 empty-card-blob ${className}`}
    >
      <div className="relative flex flex-col items-center gap-3.5 max-w-lg">
        <Medallion size="lg" scheme={MEDALLION_SCHEME[scheme] ?? MEDALLION_SCHEME[404]}>
          <em className={scheme === '404' ? 'text-gradient-display relative z-10' : 'relative z-10 not-italic'}>
            {MEDALLION_TEXT[scheme] ?? MEDALLION_TEXT[404]}
          </em>
        </Medallion>

        {title && (
          <Heading className="font-display italic font-normal text-4xl leading-[1.05] tracking-tight text-ink">
            {title}
          </Heading>
        )}

        {description && <p className="text-base text-ink-soft leading-relaxed font-medium max-w-md">{description}</p>}

        {actionList.length > 0 && (
          <div ref={actionsRef} className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
            {actionList}
          </div>
        )}
      </div>
    </div>
  )
}
