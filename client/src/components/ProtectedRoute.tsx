import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export type ProtectedRouteProps = {
  children: ReactNode
  requireOnboarded?: boolean
}

// `requireOnboarded={false}` is needed on the /welcome route itself —
// otherwise the gate would redirect un-onboarded users away from the
// only place they can actually become onboarded.
export default function ProtectedRoute({ children, requireOnboarded = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-3 border-leaf border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireOnboarded && !user.onboarded) {
    return <Navigate to="/welcome" replace />
  }

  return children
}
