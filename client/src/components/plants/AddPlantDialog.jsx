import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAddPlant } from '../../hooks/useAddPlant'
import { useWizardSteps } from '../../hooks/useWizardSteps'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import WizardTransition from '../wizard/WizardTransition'
import StepDetails from './StepDetails'
import StepSpecies from './StepSpecies'

const TITLE = 'Add a plant'

// Two-step modal wizard: pick a species → fill details. Self-managed steps —
// each owns its form/scroll (the species results list must stay bounded +
// scroll), so this uses WizardTransition in crossfade-only mode rather than
// the height-animating variant WizardDialog uses. Linear nav via useWizardSteps.
export default function AddPlantDialog() {
  const { isOpen, defaultSpaceId, close } = useAddPlant()
  const navigate = useNavigate()
  const toast = useToast()
  const titleId = useId()
  const { stepIndex, goNext, goBack, reset } = useWizardSteps(2)
  const [pendingSpecies, setPendingSpecies] = useState(null)

  // Persistent dialog (context-driven, not remounted) → reset to step 0 +
  // clear the picked species every time it reopens.
  useEffect(() => {
    if (isOpen) {
      setPendingSpecies(null)
      reset()
    }
  }, [isOpen, reset])

  function handlePick(species) {
    setPendingSpecies(species)
    goNext()
  }

  function handleSubmitSuccess(plant) {
    close()
    toast.success(`Added ${plant.nickname} 🌿`)
    // Caller pre-picked a space → user was in a space-context flow
    // (House per-space CTA, list-view accordion menu). Stay on the page.
    // No pre-pick → generic CTA (Today empty state, plants row) → jump to
    // the plant's detail page.
    if (defaultSpaceId == null) {
      navigate(`/plants/${plant.id}`)
    }
  }

  return (
    <Dialog open={isOpen} onClose={close} title={TITLE} ariaLabelledBy={titleId} className="h-[80dvh] sm:h-[560px]">
      <Card.Header divider={false}>
        <p id={titleId} className="text-lg font-extrabold text-ink">
          {TITLE}
        </p>
      </Card.Header>
      <WizardTransition currentKey={stepIndex} animateHeight={false}>
        {stepIndex === 0 ? (
          <StepSpecies onPick={handlePick} />
        ) : (
          <StepDetails
            species={pendingSpecies}
            defaultSpaceId={defaultSpaceId}
            onBack={goBack}
            onSubmitSuccess={handleSubmitSuccess}
          />
        )}
      </WizardTransition>
    </Dialog>
  )
}
