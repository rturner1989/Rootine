import Action from '../../ui/Action'
import Divider from '../../ui/Divider'

const BUTTON_CLASSES =
  'w-full px-4 py-2.5 rounded-md bg-paper-deep border border-paper-edge text-sm font-semibold text-ink-soft cursor-not-allowed opacity-70'

export default function AuthProviders() {
  return (
    <>
      <Divider className="my-5">or</Divider>
      <div className="flex flex-col gap-2.5">
        <Action variant="unstyled" disabled title="Coming soon" className={BUTTON_CLASSES}>
          Continue with Google
        </Action>
        <Action variant="unstyled" disabled title="Coming soon" className={BUTTON_CLASSES}>
          Continue with Apple
        </Action>
      </div>
    </>
  )
}
