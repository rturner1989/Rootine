import { faPen, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { formatLongDate } from '../../utils/dates'
import Action from '../ui/Action'
import ActionIcon from '../ui/ActionIcon'
import Card from '../ui/Card'
import Medallion from '../ui/Medallion'
import PageHeader from '../ui/PageHeader'

export default function Hero({ profile, onEdit }) {
  const { logout } = useAuth()
  const toast = useToast()
  const initial = profile?.name?.[0]?.toUpperCase() ?? '?'
  const joined = formatLongDate(profile?.joined_on)
  const meta = [profile?.email, joined && `joined ${joined}`].filter(Boolean).join(' · ')

  async function handleLogout() {
    await logout()
    toast.success('Logged out')
  }

  return (
    <Card
      variant="paper-warm"
      className="shadow-warm-md flex flex-col sm:flex-row items-center gap-5 sm:gap-6 p-5 sm:px-6"
    >
      <div className="relative shrink-0">
        <Medallion>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </Medallion>
        {/* Positioned on a wrapper, not on ActionIcon: the primitive sets
            `relative` itself, which beats an `absolute` passed in via
            className. It sits over the medallion's edge, so it carries a
            paper ring to stay legible against the photo behind it. */}
        <span className="absolute right-0 bottom-0">
          <ActionIcon
            icon={faPen}
            label="Edit profile"
            onClick={onEdit}
            scheme="overlay"
            size="md"
            className="shadow-warm-md ring-2 ring-paper"
          />
        </span>
      </div>

      <PageHeader
        eyebrow="Your settings"
        meta={meta}
        className="flex-1 w-full"
        actions={
          <Action variant="ghost-danger" onClick={handleLogout}>
            <FontAwesomeIcon icon={faRightFromBracket} className="w-3" />
            Log out
          </Action>
        }
      >
        <em className="text-gradient-display">{profile?.name}</em>
      </PageHeader>
    </Card>
  )
}
