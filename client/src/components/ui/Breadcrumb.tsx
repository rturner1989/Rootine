import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { To } from 'react-router-dom'
import Action from './Action'

export type BreadcrumbItem = {
  label: string
  to?: To
}

export type BreadcrumbProps = {
  items?: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  if (!items?.length) return null

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-1.5 list-none p-0 m-0 eyebrow-label">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.to ?? 'current'}-${item.label}`} className="flex items-center gap-1.5">
              {item.to && !isLast ? (
                <Action to={item.to} variant="unstyled" className="text-forest hover:text-emerald transition-colors">
                  {item.label}
                </Action>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="text-forest">
                  {item.label}
                </span>
              )}
              {!isLast && (
                <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" className="w-2.5 h-2.5 text-forest/40" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
