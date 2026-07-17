import { faKey, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Action from '../ui/Action'
import Heading from '../ui/Heading'

// Coral-dashed rather than a paper card — this is the one region of Me
// where an accidental click costs something, so it reads as roped off.
// Export data is absent until an endpoint exists to back it.
export default function DangerZone({ onChangePassword, onDeleteAccount }) {
  return (
    <section className="rounded-md bg-paper border border-dashed border-coral-deep/30 px-6 py-4">
      <Heading as="h2" variant="panel" className="text-coral-deep">
        Danger zone
      </Heading>
      <p className="text-xs text-ink-soft leading-relaxed mt-1 mb-3">
        Changing your password signs nothing else out. Deleting your account is permanent.
      </p>

      <div className="flex flex-wrap gap-2">
        <Action type="button" variant="secondary" onClick={onChangePassword}>
          <FontAwesomeIcon icon={faKey} className="w-3" />
          Change password
        </Action>
        <Action type="button" variant="ghost-danger" onClick={onDeleteAccount}>
          <FontAwesomeIcon icon={faTrashCan} className="w-3" />
          Delete account
        </Action>
      </div>
    </section>
  )
}
