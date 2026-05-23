import { motion } from 'motion/react'
import { Outlet, useParams } from 'react-router-dom'
import Logo from '../components/Logo'
import {
  getIntentConfig,
  LAST_STEP,
  STEP_NAMES,
  stepFromSlug,
  TOTAL_STEPS,
} from '../components/onboarding/intentConfig'
import StepProgress from '../components/wizard/StepProgress'
import { useAuth } from '../hooks/useAuth'

export default function OnboardingLayout() {
  const { step: slug } = useParams()
  const step = stepFromSlug(slug)

  const { user } = useAuth()
  const intent = user?.onboarding_intent ?? null
  const intentConfig = getIntentConfig(intent)
  const skipSteps = intentConfig?.skipSteps ?? []

  const showProgress = step > 0
  const isLastStep = step === LAST_STEP

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[image:var(--gradient-mint)]">
      <div
        aria-hidden="true"
        className="onboarding-blob onboarding-blob-mint pointer-events-none absolute"
        style={{ width: '480px', height: '480px', top: '-180px', right: '-200px' }}
      />
      <div
        aria-hidden="true"
        className="onboarding-blob onboarding-blob-sun pointer-events-none absolute"
        style={{ width: '380px', height: '380px', bottom: '-140px', left: '-120px' }}
      />

      <div className="relative z-10 min-h-dvh flex flex-col pt-[env(safe-area-inset-top)] sm:pt-0">
        <header className="hidden sm:flex items-center justify-between px-6 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:pt-6 sm:pb-6">
          <Logo />
        </header>

        {/* Wrapper always renders so welcome's `<main>` doesn't reflow when
         *  the bar appears. Content fades on the welcome ↔ wizard boundary
         *  at the same rhythm as Welcome.jsx's inner step content (delay
         *  0.8s in, 0.2s out). */}
        <div className="px-6 sm:px-10 max-w-[820px] w-full mx-auto">
          <motion.div
            initial={false}
            animate={{
              opacity: showProgress ? 1 : 0,
              transition: showProgress
                ? { duration: 0.25, ease: 'easeOut', delay: 0.8 }
                : { duration: 0.2, ease: 'easeOut' },
            }}
            aria-hidden={showProgress ? undefined : 'true'}
          >
            <div className="flex flex-col mb-4">
              <div className="order-2 sm:order-1">
                <StepProgress step={step} total={TOTAL_STEPS - 1} skipSteps={skipSteps} />
              </div>
              <p className="order-1 sm:order-2 mb-2 sm:mt-2 sm:mb-0 text-[10px] font-extrabold text-emerald uppercase tracking-wider">
                {isLastStep ? STEP_NAMES[LAST_STEP] : `Step ${step} of ${TOTAL_STEPS - 1} · ${STEP_NAMES[step]}`}
              </p>
            </div>
          </motion.div>
        </div>

        <main className="flex-1 flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-10 sm:pb-10 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
