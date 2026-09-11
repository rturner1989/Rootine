import Action from '../components/ui/Action'
import ErrorState from '../components/ui/errors/ErrorState'

export default function NotFound() {
  return (
    <ErrorState
      scheme="404"
      title={
        <>
          This page isn't <em>in your greenhouse</em>
        </>
      }
      description="The link you followed doesn't exist, or the plant moved on to a different garden. No soil lost — pick somewhere else to go."
      actions={[
        <Action key="today" variant="primary" to="/">
          Back to Today
        </Action>,
        <Action key="house" variant="secondary" to="/house">
          Open House
        </Action>,
      ]}
    />
  )
}
