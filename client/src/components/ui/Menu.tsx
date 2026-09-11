import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import ActionIcon from './ActionIcon'
import Popover, { type PopoverPlacement } from './Popover'
import type { TooltipPlacement } from './Tooltip'

type MenuContextValue = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  triggerRef: RefObject<HTMLButtonElement | null>
  panelRef: RefObject<HTMLDivElement | null>
  panelId: string
  label: string
}

const MenuContext = createContext<MenuContextValue | null>(null)

function useMenuContext(): MenuContextValue {
  const value = useContext(MenuContext)
  if (!value) throw new Error('Menu subcomponents must be inside <Menu>')
  return value
}

const ITEM_VARIANTS = {
  default: 'text-ink hover:bg-mint/50',
  danger: 'text-coral-deep hover:bg-coral/10',
} as const

type MenuItemVariant = keyof typeof ITEM_VARIANTS

export type MenuProps = {
  label: string
  children?: ReactNode
}

function Menu({ label, children }: MenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const value = useMemo(() => ({ open, setOpen, triggerRef, panelRef, panelId, label }), [open, panelId, label])

  return (
    <MenuContext.Provider value={value}>
      <div className="relative inline-flex">{children}</div>
    </MenuContext.Provider>
  )
}

export type MenuTriggerProps = {
  className?: string
  tooltipPlacement?: TooltipPlacement
  icon?: IconProp
}

function Trigger({ className = '', tooltipPlacement = 'bottom-end', icon = faBars }: MenuTriggerProps) {
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

export type MenuItemsProps = {
  placement?: PopoverPlacement
  className?: string
  children?: ReactNode
}

function Items({ placement = 'bottom-right', className = '', children }: MenuItemsProps) {
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
    let cleanup: (() => void) | null = null
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const items = () => Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      items()[0]?.focus()

      function handleKey(event: KeyboardEvent) {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const list = items()
        if (list.length === 0) return
        // indexOf compares by reference — document.activeElement (Element |
        // null) not being in `list` still correctly falls through to -1
        // whether or not it's actually an HTMLElement, so this cast doesn't
        // change the runtime check, only satisfies indexOf's element type.
        const current = list.indexOf(document.activeElement as HTMLElement)
        let next: number
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

  function handleClose({ reason }: { reason?: 'outside' | 'escape' } = {}) {
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

export type MenuItemProps = {
  icon?: IconProp
  onClick?: () => void
  variant?: MenuItemVariant
  children?: ReactNode
}

function Item({ icon, onClick, variant = 'default', children }: MenuItemProps) {
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

export default Object.assign(Menu, { Trigger, Items, Item, Divider })
