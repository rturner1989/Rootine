import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useId } from 'react'
import Action from '../ui/Action'
import Tooltip from '../ui/Tooltip'

const VARIANTS = {
  // Default — standalone search field. Larger touch target, paper bg,
  // 16px text so iOS doesn't auto-zoom on focus. Used in mobile drawer.
  default: {
    container: 'px-3.5 py-2 bg-paper rounded-full border border-paper-edge shadow-warm-sm focus-within:border-emerald',
    icon: 'w-3 h-3 text-ink-softer',
    input: 'text-base font-semibold text-ink placeholder:text-ink-softer placeholder:font-normal',
    clearButton: 'w-6 h-6 rounded-full text-ink-softer hover:text-ink hover:bg-paper-deep',
    clearIcon: 'w-3 h-3',
  },
  // Compact — sidebar pill. Paper-deep bg, smaller text + magnifier,
  // emerald accent, fits in the chrome strip alongside nav.
  compact: {
    container: 'h-9 px-3 bg-paper-deep rounded-full',
    icon: 'w-3 h-3 text-emerald',
    input: 'text-xs font-semibold text-ink placeholder:text-ink-soft disabled:cursor-not-allowed',
    clearButton: 'w-5 h-5 rounded-full text-ink-softer hover:text-ink hover:bg-paper',
    clearIcon: 'w-2.5 h-2.5',
  },
}

export default function SearchInput({
  value,
  onChange,
  onClear,
  hasFilterToClear = false,
  placeholder = 'Search…',
  inputRef,
  variant = 'default',
  disabled = false,
  shortcutHint,
  className = '',
}) {
  const inputId = useId()
  const styles = VARIANTS[variant] ?? VARIANTS.default
  const showClear = !disabled && (Boolean(value) || hasFilterToClear)

  function handleClear() {
    if (onClear) onClear()
    else onChange('')
  }

  return (
    <div
      className={`flex items-center gap-2 transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald/40 ${styles.container} ${className}`}
    >
      <label htmlFor={inputId} className="flex-1 min-w-0 flex items-center gap-2 cursor-text">
        <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" className={`shrink-0 ${styles.icon}`} />
        <span className="sr-only">{placeholder}</span>
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 min-w-0 bg-transparent border-0 outline-none ${styles.input}`}
        />
      </label>
      {showClear ? (
        <Action
          variant="unstyled"
          onClick={handleClear}
          aria-label={hasFilterToClear ? 'Clear search and filter' : 'Clear search'}
          className={`relative group shrink-0 flex items-center justify-center ${styles.clearButton}`}
        >
          <FontAwesomeIcon icon={faXmark} className={styles.clearIcon} />
          <Tooltip placement="top">Clear</Tooltip>
        </Action>
      ) : (
        shortcutHint && (
          <span
            aria-hidden="true"
            className="shrink-0 px-[5px] py-[1px] rounded-sm border border-paper-edge bg-paper text-[9px] text-ink-soft font-mono"
          >
            {shortcutHint}
          </span>
        )
      )}
    </div>
  )
}
