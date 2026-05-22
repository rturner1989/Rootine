import {
  faArrowRightFromBracket,
  faBook,
  faHouse,
  faMagnifyingGlass,
  faPenToSquare,
  faSun,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { useSearch } from '../hooks/useSearch'
import Logo from './Logo'
import NotificationsTrigger from './notifications/NotificationsTrigger'
import OrganiserTrigger from './organiser/OrganiserTrigger'
import SearchInput from './search/SearchInput'
import Action from './ui/Action'
import ActionIcon from './ui/ActionIcon'
import Avatar from './ui/Avatar'
import Tooltip from './ui/Tooltip'

const navItems = [
  { to: '/', label: 'Today', icon: faSun, end: true },
  { to: '/house', label: 'House', icon: faHouse },
  { to: '/journal', label: 'Journal', icon: faPenToSquare },
  { to: '/encyclopedia', label: 'Encyclopedia', icon: faBook },
  { to: '/me', label: 'Me', icon: faUser },
]

const revealVariants = {
  hidden: { x: -260 },
  visible: {
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

const drawerMotion = {
  initial: { x: -260 },
  animate: { x: 0 },
  exit: { x: -260 },
  transition: { duration: 0.28, ease: [0.33, 1, 0.68, 1] },
}

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl+K'

function UserAvatar({ user }) {
  return (
    <Avatar
      src={user.avatar_url}
      fallback={<span className="text-emerald font-bold">{user.name?.[0]?.toUpperCase() ?? '?'}</span>}
      size="sm"
      shape="circle"
    />
  )
}

function NavLinkFull({ to, label, icon, end = false, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 py-[7px] px-[10px] rounded-md text-sm font-semibold mx-3 transition-colors ${
          isActive ? 'bg-mint text-forest font-bold' : 'text-ink-soft hover:bg-mint/50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] shrink-0 ${
              isActive ? 'bg-emerald text-paper' : 'text-ink-softer'
            }`}
          >
            <FontAwesomeIcon icon={icon} className="w-3 h-3" />
          </span>
          <span className="flex-1">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function NavLinkRail({ to, label, icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `group relative w-11 h-11 rounded-md flex items-center justify-center transition-colors ${
          isActive ? 'bg-mint text-forest' : 'text-ink-softer hover:bg-mint/50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center ${
              isActive ? 'bg-emerald text-paper' : ''
            }`}
          >
            <FontAwesomeIcon icon={icon} className="w-3 h-3" />
          </span>
          <Tooltip placement="right">{label}</Tooltip>
        </>
      )}
    </NavLink>
  )
}

function UserCard({ user, onLogout, onNavigate }) {
  if (!user) return null
  return (
    <div className="px-3 pb-4 pt-3 border-t border-paper-edge">
      <div className="flex items-center gap-2">
        <Action
          to="/me"
          variant="unstyled"
          aria-label="View profile"
          onClick={onNavigate}
          className="flex items-center gap-2 flex-1 min-w-0 p-1 rounded-md hover:bg-mint/50 transition-colors"
        >
          <UserAvatar user={user} />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-ink truncate">{user.name}</p>
            <p className="text-xs text-ink-softer truncate">{user.email}</p>
          </div>
        </Action>
        <ActionIcon icon={faArrowRightFromBracket} label="Log out" onClick={onLogout} scheme="ghost-danger" />
      </div>
    </div>
  )
}

function Body({ user, onLogout, onClose }) {
  const search = useSearch()

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-4">
        <Logo to="/" size="sm" />
        {onClose ? (
          <ActionIcon icon={faXmark} label="Close menu" onClick={onClose} scheme="paper" className="shrink-0" />
        ) : (
          <div className="flex items-center gap-1.5">
            <OrganiserTrigger />
            <NotificationsTrigger />
          </div>
        )}
      </div>

      <SearchInput
        variant="compact"
        value={search.isActive ? search.query : ''}
        onChange={search.setQuery}
        onClear={search.clearAll}
        hasFilterToClear={search.hasFilterToClear}
        placeholder={search.isActive ? search.placeholder : 'Search… (coming soon)'}
        disabled={!search.isActive}
        shortcutHint={SHORTCUT_LABEL}
        inputRef={search.sidebarInputRef}
        className="mx-3"
      />

      <nav aria-label="Primary" className="flex flex-col gap-0.5 mt-3">
        {navItems.map((item) => (
          <motion.div key={item.to} variants={itemVariants}>
            <NavLinkFull {...item} onNavigate={onClose} />
          </motion.div>
        ))}
      </nav>

      <div className="flex-1" />

      <UserCard user={user} onLogout={onLogout} onNavigate={onClose} />
    </>
  )
}

function RailBody({ user, onLogout }) {
  return (
    <>
      <div className="pt-4 pb-2 flex justify-center">
        <Logo to="/" size="sm" markOnly />
      </div>

      <div className="flex justify-center pb-2">
        <Action
          variant="unstyled"
          disabled
          aria-label="Search (coming soon)"
          className="w-10 h-10 rounded-full bg-paper-deep flex items-center justify-center text-emerald"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} className="w-3 h-3" />
        </Action>
      </div>

      <nav aria-label="Primary" className="flex flex-col items-center gap-1 w-full">
        {navItems.map((item) => (
          <motion.div key={item.to} variants={itemVariants}>
            <NavLinkRail {...item} />
          </motion.div>
        ))}
      </nav>

      <div className="flex-1" />

      {user && (
        <div className="pb-4 flex justify-center border-t border-paper-edge pt-3">
          <Action
            to="/me"
            variant="unstyled"
            aria-label="View profile"
            className="relative group w-11 h-11 rounded-full overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-mint transition-shadow"
          >
            <UserAvatar user={user} />
            <Tooltip placement="right">Profile</Tooltip>
          </Action>
          <ActionIcon
            icon={faArrowRightFromBracket}
            label="Log out"
            onClick={onLogout}
            scheme="ghost-danger"
            tooltipPlacement="right"
            className="ml-1"
          />
        </div>
      )}
    </>
  )
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Sidebar({ isFirstRun = false, isOpen = false, onClose }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  const shouldReduceMotion = useReducedMotion()
  const shouldAnimateReveal = isFirstRun && !shouldReduceMotion
  const onCloseRef = useRef(onClose)
  const drawerRef = useRef(null)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement
    const drawer = drawerRef.current
    const closeButton = drawer?.querySelector('[aria-label="Close menu"]')
    const initialFocus = closeButton ?? drawer?.querySelector(FOCUSABLE_SELECTOR)
    initialFocus?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !drawer) return
      const focusables = drawer.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [isOpen])

  async function handleLogout() {
    await logout()
    toast.success('Logged out')
    onClose?.()
  }

  return (
    <>
      <motion.aside
        className="hidden desktop:flex flex-col w-[260px] h-dvh bg-paper shadow-warm-md border-r border-paper-edge/50 fixed left-0 top-0 z-40"
        variants={revealVariants}
        initial={shouldAnimateReveal ? 'hidden' : false}
        animate={shouldAnimateReveal ? 'visible' : false}
      >
        <Body user={user} onLogout={handleLogout} />
      </motion.aside>

      <motion.aside
        className="hidden md:flex desktop:hidden flex-col w-[64px] h-dvh bg-paper shadow-warm-md border-r border-paper-edge/50 fixed left-0 top-0 z-40"
        variants={revealVariants}
        initial={shouldAnimateReveal ? 'hidden' : false}
        animate={shouldAnimateReveal ? 'visible' : false}
      >
        <RailBody user={user} onLogout={handleLogout} />
      </motion.aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={onClose}
              className="hidden xs:block md:hidden fixed inset-0 z-40 bg-black/50 border-0 cursor-pointer"
              {...backdropMotion}
            />
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="hidden xs:flex md:hidden flex-col w-[260px] h-dvh bg-paper shadow-warm-md border-r border-paper-edge/50 fixed left-0 top-0 z-50"
              {...drawerMotion}
            >
              <Body user={user} onLogout={handleLogout} onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
