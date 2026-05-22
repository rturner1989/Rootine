import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getIntentConfig,
  nextVisibleStep,
  pathForStep,
  previousVisibleStep,
  stepFromSlug,
} from '../components/onboarding/intentConfig'
import Step0Welcome from '../components/onboarding/Step0Welcome'
import Step1Intent from '../components/onboarding/Step1Intent'
import Step2Spaces from '../components/onboarding/Step2Spaces'
import Step3Plants from '../components/onboarding/Step3Plants'
import Step4Environment from '../components/onboarding/Step4Environment'
import Step5Stakes from '../components/onboarding/Step5Stakes'
import Step6Journal from '../components/onboarding/Step6Journal'
import Step7Done from '../components/onboarding/Step7Done'
import Spinner from '../components/ui/Spinner'
import WizardCard from '../components/wizard/WizardCard'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { usePlants } from '../hooks/usePlants'
import { useSpaces } from '../hooks/useSpaces'
import { useSpeciesSearch } from '../hooks/useSpecies'

export default function Welcome() {
  const { step: slug } = useParams()
  const step = stepFromSlug(slug)

  const navigate = useNavigate()
  const { user, updateUser, markOnboarded } = useAuth()
  const toast = useToast()
  const shouldReduceMotion = useReducedMotion()

  const intent = user?.onboarding_intent ?? null
  const intentConfig = getIntentConfig(intent)

  const [finishing, setFinishing] = useState(false)

  const { data: createdPlants = [] } = usePlants()

  useEffect(() => {
    if (user?.onboarded) {
      navigate('/', { replace: true })
    }
  }, [user?.onboarded, navigate])

  const { data: existingSpaces } = useSpaces({ enabled: !user?.onboarded })
  useSpeciesSearch('')

  const goToStep = useCallback(
    (target) => {
      navigate(pathForStep(target))
    },
    [navigate],
  )

  const persistStepReached = useCallback(
    async (target) => {
      try {
        await updateUser({ onboarding_step_reached: target })
      } catch (err) {
        toast.error(err.message ?? "Couldn't save your progress — try again.")
      }
    },
    [updateUser, toast],
  )

  const handleNext = useCallback(() => {
    const target = nextVisibleStep(step, intent)
    if (target === step) return
    goToStep(target)
    persistStepReached(target)
  }, [step, intent, goToStep, persistStepReached])

  const handleBack = useCallback(() => {
    const target = previousVisibleStep(step, intent)
    goToStep(target)
  }, [step, intent, goToStep])

  const handleSetIntent = useCallback(
    async (chosenIntent) => {
      try {
        await updateUser({ onboarding_intent: chosenIntent, onboarding_step_reached: 2 })
        goToStep(2)
      } catch (err) {
        toast.error(err.message ?? "Couldn't save your intent — try again.")
      }
    },
    [updateUser, goToStep, toast],
  )

  const handlePlantsAdded = useCallback(() => {
    handleNext()
  }, [handleNext])

  const handleFinish = useCallback(async () => {
    setFinishing(true)
    try {
      await markOnboarded()
      localStorage.setItem('plantcare_tour_pending', 'true')
      const route = intentConfig?.completionRoute ?? '/'
      navigate(route, { replace: true })
    } catch (err) {
      toast.error(err.message ?? "Couldn't finish setup — please try again")
      setFinishing(false)
    }
  }, [markOnboarded, navigate, intentConfig, toast])

  const needsSpaces = step === 2 || step === 3 || step === 4
  if (needsSpaces && existingSpaces === undefined) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Spinner />
      </div>
    )
  }

  function renderStep() {
    if (step === 0) return <Step0Welcome onNext={handleNext} />
    if (step === 1) return <Step1Intent initialIntent={intent} onBack={handleBack} onContinue={handleSetIntent} />
    if (step === 2) return <Step2Spaces onBack={handleBack} onComplete={handleNext} />
    if (step === 3)
      return <Step3Plants availableSpaces={existingSpaces} onBack={handleBack} onComplete={handlePlantsAdded} />
    if (step === 4) return <Step4Environment onBack={handleBack} onContinue={handleNext} />
    if (step === 5) return <Step5Stakes onBack={handleBack} onContinue={handleNext} />
    if (step === 6) return <Step6Journal onBack={handleBack} onContinue={handleNext} />
    if (step === 7) return <Step7Done createdPlants={createdPlants} onFinish={handleFinish} finishing={finishing} />

    return null
  }

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }
  const isWelcome = step === 0

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center w-full">
      {/* Welcome ↔ wizard handoff: children fade → layoutId morph → step
       *  content fades. Mirror sequence on Back. No `mode="wait"` on outer
       *  AnimatePresence — layoutId needs both branches alive so framer can
       *  read the source rect. Branches absolute-overlay so they don't fight
       *  for layout while concurrent. */}
      <AnimatePresence initial={false}>
        {isWelcome ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1, transition: { duration: 0.85 } }}
            className="absolute inset-0 flex flex-col items-center justify-center w-full"
          >
            {renderStep()}
          </motion.div>
        ) : (
          <motion.div
            key="wizard"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1, transition: { duration: 0.85 } }}
            className="absolute inset-0 flex flex-col items-center justify-center w-full"
          >
            <WizardCard>
              {/* Outer fade tracks the wizard ↔ welcome boundary: on first
               *  mount the wrapper fades in *after* the layoutId morph
               *  (delay 0.8s). On Back, animate target flips to 0 and
               *  content fades *before* the morph starts (delay 0). The
               *  inner AnimatePresence still handles step 1↔7 crossfades. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut', delay: 0.8 }}
                exit={{
                  opacity: 0,
                  transition: shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' },
                }}
                className="flex-1 flex flex-col min-h-0"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </WizardCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
