import { faBars } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import ActionIcon from './ActionIcon'
import Popover from './Popover'

const MenuContext = createContext(null)

function useMenuContext() {
  const value = useContext(MenuContext)
  if (!value) throw new Error('Menu subcomponents must be inside <Menu>')
  return value
}

const ITEM_VARIANTS = {
  default: 'text-ink hover:bg-mint/50',
  danger: 'text-coral-deep hover:bg-coral/10',
}

export default function Menu({ label, children }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  const value = useMemo(() => ({ open, setOpen, triggerRef, panelRef, panelId, label }), [open, panelId, label])

  return (
    <MenuContext.Provider value={value}>
      <div className="relative inline-flex">{children}</div>
    </MenuContext.Provider>
  )
}

function Trigger({ className = '', tooltipPlacement = 'bottom-end', icon = faBars }) {
  const { open, setOpen, triggerRef, panelId, label } = useMenuContext()
  return (
    <ActionIcon
      ref={triggerRef}
      icon={icon}
      label={label}
      onClick={() => setOpen((current) => !current)}
      scheme="neutral"
      tooltip={!open}
      tooltipPlacement={tooltipPlacement}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={panelId}
      className={className}
    />
  )
}

function Items({ placement = 'bottom-right', className = '', children }) {
  const { open, setOpen, triggerRef, panelRef, panelId, label } = useMenuContext()

  // WAI-ARIA APG menu pattern — focus first menuitem on mount, then
  // ArrowDown/Up/Home/End cycle. Roving tabindex skipped: with 2-4 item
  // menus, all menuitems being Tabbable is acceptable.
  //
  // RAF defer so the panel (which Popover renders one re-render after
  // its layout effect computes the portal position) is in the DOM
  // before we query menuitems.
  useEffect(() => {
    if (!open) return
    let cleanup = null
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const items = () => Array.from(panel.querySelectorAll('[role="menuitem"]'))
      items()[0]?.focus()

      function handleKey(event) {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const list = items()
        if (list.length === 0) return
        const current = list.indexOf(document.activeElement)
        let next
        if (event.key === 'ArrowDown') next = current === -1 ? 0 : (current + 1) % list.length
        else if (event.key === 'ArrowUp')
          next = current === -1 ? list.length - 1 : (current - 1 + list.length) % list.length
        else if (event.key === 'Home') next = 0
        else next = list.length - 1
        list[next].focus()
      }
      document.addEventListener('keydown', handleKey)
      cleanup = () => document.removeEventListener('keydown', handleKey)
    })

    return () => {
      cancelAnimationFrame(frame)
      cleanup?.()
    }
  }, [open, panelRef])

  function handleClose({ reason } = {}) {
    setOpen(false)
    if (reason === 'escape') triggerRef.current?.focus()
  }

  return (
    <Popover
      open={open}
      onClose={handleClose}
      anchorRef={triggerRef}
      panelRef={panelRef}
      id={panelId}
      role="menu"
      label={label}
      placement={placement}
      portal
      className={`min-w-[180px] ${className}`}
    >
      <ul className="list-none m-0 p-0 flex flex-col">{children}</ul>
    </Popover>
  )
}

function Item({ icon, onClick, variant = 'default', children }) {
  const { setOpen } = useMenuContext()
  const variantClass = ITEM_VARIANTS[variant] ?? ITEM_VARIANTS.default
  return (
    <li className="list-none">
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClick?.()
          setOpen(false)
        }}
        className={`w-full flex items-center gap-2 py-[7px] px-[10px] rounded-md text-left text-sm font-semibold cursor-pointer transition-colors ${variantClass}`}
      >
        {icon && (
          <span aria-hidden="true" className="shrink-0 w-4 h-4 flex items-center justify-center">
            <FontAwesomeIcon icon={icon} className="w-3 h-3" />
          </span>
        )}
        <span className="truncate">{children}</span>
      </button>
    </li>
  )
}

function Divider() {
  return (
    <li role="presentation" className="list-none">
      <hr className="my-1 border-0 border-t border-paper-edge" />
    </li>
  )
}

Menu.Trigger = Trigger
Menu.Items = Items
Menu.Item = Item
Menu.Divider = Divider
