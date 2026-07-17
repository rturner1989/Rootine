import Hero from '../components/me/Hero'
import StatStrip from '../components/me/StatStrip'
import Action from '../components/ui/Action'
import ErrorState from '../components/ui/errors/ErrorState'
import Spinner from '../components/ui/Spinner'
import { useProfile } from '../hooks/useProfile'

export default function Me() {
  const { data: profile, isLoading, error, refetch } = useProfile()

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading your settings"
        className="flex-1 flex items-center justify-center min-h-dvh"
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        scheme="500"
        title={
          <>
            Couldn't load your <em>settings</em>
          </>
        }
        description="We couldn't fetch your profile. Try again, or head back home."
        actions={[
          <Action key="retry" type="button" variant="primary" onClick={() => refetch()}>
            Try again
          </Action>,
        ]}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 px-3 lg:px-6 py-4 lg:py-6">
      <Hero profile={profile} />
      <StatStrip stats={profile?.stats} />
    </div>
  )
}
