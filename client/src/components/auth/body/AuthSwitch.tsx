import { useLocation } from 'react-router-dom'
import Action from '../../ui/Action'

type SwitchEntry = {
  prompt: string
  linkText: string
  to: string
}

const SWITCH_BY_PATH: Record<string, SwitchEntry> = {
  '/login': { prompt: "Don't have an account?", linkText: 'Sign up', to: '/register' },
  '/register': { prompt: 'Already have an account?', linkText: 'Log in', to: '/login' },
  '/forgot-password': { prompt: 'Remembered it?', linkText: 'Log in', to: '/login' },
}

export default function AuthSwitch() {
  const location = useLocation()
  const target = SWITCH_BY_PATH[location.pathname]
  if (!target) return null

  return (
    <p className="mt-5 text-sm text-ink-soft text-center">
      {target.prompt}{' '}
      <Action to={target.to} variant="unstyled" className="text-emerald font-bold hover:underline">
        {target.linkText}
      </Action>
    </p>
  )
}
