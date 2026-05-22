import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Action from './Action'

export default function Breadcrumb({ items, className = '' }) {
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
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'text-forest' : 'text-forest'}>
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
