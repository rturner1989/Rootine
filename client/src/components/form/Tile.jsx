import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Action from '../ui/Action'
import Tooltip from '../ui/Tooltip'

const CONTAINER = 'flex items-center rounded-md border-[1.5px] transition-colors duration-200'

const SIZES = {
  chip: 'text-sm font-bold',
  card: 'text-base',
}

const SELECTED_BY_SIZE = {
  chip: 'bg-mint border-leaf text-ink',
  card: 'bg-mint border-leaf',
}

const UNSELECTED_BY_SIZE = {
  chip: 'bg-paper-deep border-paper-edge text-ink hover:bg-mint/40 hover:border-leaf',
  card: 'bg-paper-deep border-paper-edge hover:bg-mint/40 hover:border-leaf',
}

const PRIMARY_PADDING_BY_SIZE = {
  chip: 'gap-2 px-3 py-2.5',
  card: 'gap-3 p-3',
}

const ICON_BY_SIZE = {
  chip: {
    base: 'w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-colors duration-200',
    selected: 'bg-leaf text-paper',
    unselected: 'bg-mint text-emerald',
  },
  card: {
    base: 'text-2xl shrink-0',
    selected: '',
    unselected: '',
  },
}

const REMOVE_BUTTON =
  'relative group shrink-0 w-7 h-7 mr-1.5 rounded-full flex items-center justify-center text-ink-soft hover:bg-ink/10 cursor-pointer'

const DASHED =
  'flex items-center gap-2 px-3 py-2.5 rounded-md border-[1.5px] text-sm font-bold border-dashed bg-transparent text-ink-soft hover:text-emerald hover:border-emerald/40 justify-center transition-colors duration-200 cursor-pointer'

export default function Tile({
  icon,
  selected = false,
  dashed = false,
  size = 'chip',
  onClick,
  onRemove,
  removeLabel,
  className = '',
  children,
  ...kwargs
}) {
  if (dashed) {
    return (
      <Action variant="unstyled" onClick={onClick} className={`${DASHED} ${className}`} {...kwargs}>
        {children}
      </Action>
    )
  }

  const sizeClass = SIZES[size]
  const stateClass = selected ? SELECTED_BY_SIZE[size] : UNSELECTED_BY_SIZE[size]
  const iconConfig = ICON_BY_SIZE[size]
  const iconStateClass = selected ? iconConfig.selected : iconConfig.unselected
  // chip = compact toggle in a tight grid → keep one line, truncate the
  // overflow. card = roomy trigger → let the label flow naturally.
  const labelClass = size === 'chip' ? 'truncate' : ''

  // chip variant = toggle (Step 2 spaces) — checkbox semantics so screen
  // readers announce selection state. card variant = one-shot trigger
  // (Step 3 species → opens add-plant dialog) — native button is correct.
  const toggleProps = size === 'chip' ? { role: 'checkbox', 'aria-checked': selected } : {}

  return (
    <div className={`${CONTAINER} ${sizeClass} w-full ${stateClass} ${className}`}>
      <Action
        variant="unstyled"
        onClick={onClick}
        className={`${PRIMARY_PADDING_BY_SIZE[size]} flex-1 min-w-0 flex items-center text-left cursor-pointer`}
        {...toggleProps}
        {...kwargs}
      >
        {icon && <span className={`${iconConfig.base} ${iconStateClass}`}>{icon}</span>}
        <span className={`flex-1 min-w-0 text-left ${labelClass}`}>{children}</span>
      </Action>
      {onRemove && (
        <Action
          variant="unstyled"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          aria-label={removeLabel ?? 'Remove'}
          className={REMOVE_BUTTON}
        >
          <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
          <Tooltip placement="top">Remove</Tooltip>
        </Action>
      )}
    </div>
  )
}
