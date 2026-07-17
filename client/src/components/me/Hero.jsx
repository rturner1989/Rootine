import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { formatLongDate } from '../../utils/dates'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Medallion from '../ui/Medallion'
import PageHeader from '../ui/PageHeader'

export default function Hero({ profile }) {
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
      className="me-hero-glow shadow-warm-md flex flex-col sm:flex-row items-center gap-5 sm:gap-6 p-5 sm:px-6"
    >
      <Medallion>{initial}</Medallion>

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
