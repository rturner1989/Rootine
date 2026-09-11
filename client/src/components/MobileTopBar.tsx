import { faBars, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { useSearchActions } from '../hooks/useSearch'
import Logo from './Logo'
import NotificationsTrigger from './notifications/NotificationsTrigger'
import OrganiserTrigger from './organiser/OrganiserTrigger'
import Action from './ui/Action'
import ActionIcon from './ui/ActionIcon'
import Avatar from './ui/Avatar'
import Tooltip from './ui/Tooltip'

const barVariants: Variants = {
  hidden: { y: -100 },
  visible: {
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.08 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export type MobileTopBarProps = {
  isFirstRun?: boolean
  onMenuOpen?: () => void
}

export default function MobileTopBar({ isFirstRun = false, onMenuOpen }: MobileTopBarProps) {
  const { user } = useAuth()
  const search = useSearchActions()
  const shouldReduceMotion = useReducedMotion()
  const shouldAnimate = isFirstRun && !shouldReduceMotion

  return (
    <motion.header
      className="md:hidden fixed top-0 left-0 right-0 z-30 bg-card rounded-b-md shadow-[var(--shadow-sm)] pt-[env(safe-area-inset-top)]"
      variants={barVariants}
      initial={shouldAnimate ? 'hidden' : false}
      animate={shouldAnimate ? 'visible' : false}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {onMenuOpen && (
            <motion.div variants={itemVariants} className="hidden xs:flex">
              <ActionIcon
                icon={faBars}
                label="Open menu"
                onClick={onMenuOpen}
                size="md"
                scheme="paper"
                tooltipPlacement="bottom"
              />
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <Logo to="/" size="sm" />
          </motion.div>
        </div>

        <div className="flex items-center gap-2">
          {search.isActive && (
            <motion.div variants={itemVariants}>
              <ActionIcon
                icon={faMagnifyingGlass}
                label="Open search"
                onClick={search.openMobileDrawer}
                size="md"
                scheme="paper"
                tooltipPlacement="bottom"
              />
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <OrganiserTrigger size="lg" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <NotificationsTrigger size="lg" />
          </motion.div>

          {user && (
            <motion.div variants={itemVariants}>
              <Action to="/me" variant="unstyled" aria-label="View profile" className="relative group">
                <Avatar
                  src={user.avatar_url ?? undefined}
                  fallback={<span className="text-emerald font-bold">{user.name?.[0]?.toUpperCase() ?? '?'}</span>}
                  size="sm"
                  shape="circle"
                />
                <Tooltip placement="bottom">Profile</Tooltip>
              </Action>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  )
}
