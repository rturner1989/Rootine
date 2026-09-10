import type { ReactNode } from 'react'
import Logo from '../Logo'
import Action from '../ui/Action'
import Heading from '../ui/Heading'
import AuthProviders from './body/AuthProviders'
import AuthSwitch from './body/AuthSwitch'

export type AuthBodyProps = {
  preheading?: ReactNode
  heading?: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  showProviders?: boolean
  showSwitch?: boolean
  className?: string
}

export default function AuthBody({
  preheading,
  heading,
  subtitle,
  children,
  showProviders = true,
  showSwitch = true,
  className = '',
}: AuthBodyProps) {
  return (
    <main className="flex flex-col flex-1 px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:pt-12 sm:pb-12 lg:px-12 lg:pt-16 lg:pb-16 min-h-dvh lg:min-h-0 lg:overflow-y-auto">
      <div className="flex-1 flex items-center justify-center">
        <div className={`w-full max-w-auth mx-auto ${className}`}>
          <Logo className="lg:hidden mb-10 mx-auto" />
          <div className="bg-paper rounded-lg shadow-warm-md p-7 sm:p-8 lg:bg-transparent lg:rounded-none lg:shadow-none lg:p-0">
            {heading && (
              <Heading variant="display" className="text-ink mb-5" preheading={preheading} subtitle={subtitle}>
                {heading}
              </Heading>
            )}
            {children}
            {showProviders && <AuthProviders />}
            {showSwitch && <AuthSwitch />}
          </div>
        </div>
      </div>

      <p className="hidden lg:block mt-auto text-[11px] text-ink-softer text-center pt-8">
        By signing in you agree to our{' '}
        <Action to="#" variant="unstyled" className="underline hover:text-emerald">
          Terms
        </Action>{' '}
        &amp;{' '}
        <Action to="#" variant="unstyled" className="underline hover:text-emerald">
          Privacy
        </Action>
        .
      </p>
    </main>
  )
}
