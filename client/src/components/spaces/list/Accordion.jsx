import { faChevronRight, faPenToSquare, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useId } from 'react'
import { pluralize } from '../../../utils/pluralize'
import { formatSpaceName, getSpaceEmoji } from '../../../utils/spaceIcons'
import Action from '../../ui/Action'
import Menu from '../../ui/Menu'

export default function Accordion({ space, weatherToday, isOpen, onToggle, onAddPlant, onEdit, onDelete, children }) {
  const bodyId = useId()
  const isOutdoor = space.category === 'outdoor'
  const displayName = formatSpaceName(space.name)

  return (
    <div>
      <div className="relative">
        <Action
          variant="unstyled"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={onToggle}
          className="w-full flex items-center gap-2.5 pl-4 sm:pl-[18px] pr-[52px] py-3 bg-paper-deep border-t border-paper-edge font-display italic text-[17px] text-ink text-left cursor-pointer hover:bg-paper-edge/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald/60"
        >
          <FontAwesomeIcon
            icon={faChevronRight}
            aria-hidden="true"
            className={`shrink-0 w-2.5 h-2.5 text-ink-softer transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
          <span
            aria-hidden="true"
            className="shrink-0 w-6 h-6 rounded-full bg-mint text-emerald flex items-center justify-center text-xs not-italic font-sans"
          >
            {getSpaceEmoji(space.icon)}
          </span>
          <span className="truncate">{displayName}</span>
          {isOutdoor && weatherToday && <WeatherBadge weather={weatherToday} />}
          <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.08em] text-ink-softer not-italic font-sans">
            {pluralize(space.plants_count ?? 0, 'plant')} · {space.category}
          </span>
        </Action>

        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <Menu label={`${displayName} actions`}>
            <Menu.Trigger />
            <Menu.Items>
              {onAddPlant && (
                <Menu.Item icon={faPlus} onClick={() => onAddPlant(space)}>
                  Add plant
                </Menu.Item>
              )}
              {onEdit && (
                <Menu.Item icon={faPenToSquare} onClick={() => onEdit(space)}>
                  Edit space
                </Menu.Item>
              )}
              {onDelete && (
                <>
                  {(onAddPlant || onEdit) && <Menu.Divider />}
                  <Menu.Item icon={faTrash} variant="danger" onClick={() => onDelete(space)}>
                    Delete space
                  </Menu.Item>
                </>
              )}
            </Menu.Items>
          </Menu>
        </div>
      </div>

      <div
        id={bodyId}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

function WeatherBadge({ weather }) {
  return (
    <span className="inline-flex items-center gap-1 pl-0.5 pr-2.5 py-0.5 rounded-full text-[10px] font-bold not-italic font-sans bg-sky text-sky-deep ring-1 ring-inset ring-sky-deep/20">
      <span
        aria-hidden="true"
        className="w-4 h-4 rounded-full bg-sky-deep text-paper flex items-center justify-center text-[9px]"
      >
        {weather.icon ?? '☀'}
      </span>
      <span className="truncate max-w-[120px]">{weather.label}</span>
    </span>
  )
}
