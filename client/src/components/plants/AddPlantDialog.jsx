import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useAddPlant } from '../../hooks/useAddPlant'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import StepDetails from './StepDetails'
import StepSpecies from './StepSpecies'

const TITLE = 'Add a plant'

export default function AddPlantDialog() {
  const { isOpen, defaultSpaceId, close } = useAddPlant()
  const navigate = useNavigate()
  const toast = useToast()
  const titleId = useId()
  const [pendingSpecies, setPendingSpecies] = useState(null)

  // Reset wizard state every time dialog reopens — stale species from a
  // prior session would otherwise jump us straight to the details step.
  useEffect(() => {
    if (isOpen) setPendingSpecies(null)
  }, [isOpen])

  function handleSubmitSuccess(plant) {
    close()
    toast.success(`Added ${plant.nickname} 🌿`)
    // Caller pre-picked a space → user was in a space-context flow
    // (House per-space CTA, list-view accordion menu). Stay on the page.
    // No pre-pick → generic CTA (Today empty state, plants row) →
    // jump to the plant's detail page.
    if (defaultSpaceId == null) {
      navigate(`/plants/${plant.id}`)
    }
  }

  return (
    <Dialog open={isOpen} onClose={close} title={TITLE} ariaLabelledBy={titleId}>
      <Card.Header divider={false}>
        <p id={titleId} className="text-lg font-extrabold text-ink">
          {TITLE}
        </p>
      </Card.Header>

      {pendingSpecies ? (
        <StepDetails
          species={pendingSpecies}
          defaultSpaceId={defaultSpaceId}
          onBack={() => setPendingSpecies(null)}
          onSubmitSuccess={handleSubmitSuccess}
        />
      ) : (
        <StepSpecies onPick={setPendingSpecies} />
      )}
    </Dialog>
  )
}
