import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { ValidationError } from '../../errors/ValidationError'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useArchiveSpace, useCreateSpace, useSpacePresets } from '../../hooks/useSpaces'
import type { Plant } from '../../types/plant'
import type { Space, SpacePreset } from '../../types/space'
import type { SpeciesIndexResult } from '../../types/species'
import { getSpaceEmoji, SPACE_ICON_OPTIONS } from '../../utils/spaceIcons'
import TextInput from '../form/TextInput'
import Tile from '../form/Tile'
import StepDetails from '../plants/StepDetails'
import StepSpecies from '../plants/StepSpecies'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'

const TITLE = 'Start your jungle'

type WizardStep = 'space' | 'species' | 'details'

type SpaceFormState = {
  preset: SpacePreset | null
  customName: string
  customMode: boolean
}

export type StartJungleDialogProps = {
  open: boolean
  onClose: () => void
}

export default function StartJungleDialog({ open, onClose }: StartJungleDialogProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const titleId = useId()

  const [step, setStep] = useState<WizardStep>('space')
  const [createdSpace, setCreatedSpace] = useState<Space | null>(null)
  const [pickedSpecies, setPickedSpecies] = useState<SpeciesIndexResult | null>(null)
  // Lifted from StepFirstSpace so the user's preset / custom name choice
  // survives navigating back from species → space. Without this, the
  // selection silently resets on remount.
  const [spaceForm, setSpaceForm] = useState<SpaceFormState>({ preset: null, customName: '', customMode: false })

  function handleClose() {
    // Reset wizard state on close so a re-open starts fresh. The
    // just-created space (if any) persists — that's intentional, the
    // user can return later via the noPlants empty state.
    setStep('space')
    setCreatedSpace(null)
    setPickedSpecies(null)
    setSpaceForm({ preset: null, customName: '', customMode: false })
    onClose()
  }

  function handleSpaceCreated(space: Space) {
    setCreatedSpace(space)
    setStep('species')
  }

  function handleSpeciesPicked(species: SpeciesIndexResult) {
    setPickedSpecies(species)
    setStep('details')
  }

  function handlePlantCreated(plant: Plant) {
    toast.success(`Welcome ${plant.nickname} 🌿`)
    handleClose()
    navigate(`/plants/${plant.id}`)
  }

  function renderStep() {
    if (step === 'space') {
      return (
        <StepFirstSpace
          form={spaceForm}
          onFormChange={setSpaceForm}
          createdSpace={createdSpace}
          onAdded={handleSpaceCreated}
          onCancel={handleClose}
        />
      )
    }

    if (step === 'species') {
      return (
        <>
          <StepSpecies onPick={handleSpeciesPicked} />
          <Card.Footer divider={false} className="flex gap-2.5">
            <Action type="button" variant="secondary" onClick={() => setStep('space')}>
              Back
            </Action>
          </Card.Footer>
        </>
      )
    }

    return (
      <StepDetails
        species={pickedSpecies}
        defaultSpaceId={createdSpace?.id ?? null}
        onBack={() => setStep('species')}
        onSubmitSuccess={handlePlantCreated}
      />
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} title={TITLE} ariaLabelledBy={titleId} className="!max-w-2xl">
      <Card.Header divider={false}>
        <p id={titleId} className="text-lg font-extrabold text-ink">
          {TITLE}
        </p>
        <p
          role="status"
          aria-live="polite"
          className="mt-1 text-xs font-bold text-ink-soft uppercase tracking-[0.08em]"
        >
          Step {STEP_INDEX[step]} of 3 · {STEP_LABEL[step]}
        </p>
      </Card.Header>
      {renderStep()}
    </Dialog>
  )
}

const STEP_INDEX: Record<WizardStep, number> = { space: 1, species: 2, details: 3 }
const STEP_LABEL: Record<WizardStep, string> = {
  space: 'Pick a space',
  species: 'Pick a plant',
  details: 'Add the details',
}

type StepFirstSpaceProps = {
  form: SpaceFormState
  onFormChange: (form: SpaceFormState) => void
  createdSpace: Space | null
  onAdded: (space: Space) => void
  onCancel: () => void
}

function StepFirstSpace({ form, onFormChange, createdSpace, onAdded, onCancel }: StepFirstSpaceProps) {
  const { data: presets = [] } = useSpacePresets()
  const createSpace = useCreateSpace()
  const archiveSpace = useArchiveSpace()

  const { preset: chosenPreset, customName, customMode } = form
  const ready = customMode ? customName.trim().length > 0 : Boolean(chosenPreset)

  // Mirrors the selection back to the picker on remount-via-Back so the
  // user sees what they chose. If the space is already created, hitting
  // Continue again just advances without re-mutating (same preset/name).
  const alreadyMatches =
    createdSpace &&
    ((customMode && createdSpace.name === customName.trim()) ||
      (!customMode && chosenPreset && createdSpace.name === chosenPreset.name))

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      if (alreadyMatches) {
        onAdded(createdSpace)
        return
      }
      let payload: { name: string; icon: string; category: string }
      if (customMode) {
        const trimmed = customName.trim()
        if (!trimmed) throw new ValidationError({ name: 'Pick a name for your space.' })
        payload = {
          name: trimmed,
          icon: SPACE_ICON_OPTIONS[0].slug,
          category: 'indoor',
        }
      } else {
        if (!chosenPreset) throw new ValidationError({ preset: 'Pick a space to get started.' })
        payload = {
          name: chosenPreset.name,
          icon: chosenPreset.icon,
          category: chosenPreset.category,
        }
      }
      // User changed their mind — archive the previous selection so it
      // doesn't sit as an orphan space. Stays archived (recoverable
      // via House → Archived), not hard-deleted.
      if (createdSpace) {
        await archiveSpace.mutateAsync(createdSpace.id)
      }
      const newSpace = await createSpace.mutateAsync(payload)
      onAdded(newSpace)
    },
    errorMessage: "Couldn't add that space",
  })

  function pickPreset(preset: SpacePreset) {
    onFormChange({ preset, customName: '', customMode: false })
  }

  function enterCustomMode() {
    onFormChange({ preset: null, customName, customMode: true })
  }

  function exitCustomMode() {
    onFormChange({ preset: null, customName: '', customMode: false })
  }

  function updateCustomName(value: string) {
    onFormChange({ preset: null, customName: value, customMode: true })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
      <Card.Body className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">Where will your first plant live?</p>

        {!customMode && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {presets.map((preset) => (
              <Tile
                key={preset.name}
                size="chip"
                selected={chosenPreset?.name === preset.name}
                icon={<span aria-hidden="true">{getSpaceEmoji(preset.icon)}</span>}
                onClick={() => pickPreset(preset)}
              >
                {preset.name}
              </Tile>
            ))}
          </div>
        )}

        {customMode ? (
          <>
            <TextInput
              label="Name your space"
              type="text"
              value={customName}
              onChange={(event) => updateCustomName(event.target.value)}
              placeholder="Garage, Loft, Greenhouse…"
              error={fieldErrors.name}
              autoFocus
            />
            <button
              type="button"
              onClick={exitCustomMode}
              className="self-start text-xs font-bold text-ink-soft hover:text-ink"
            >
              ← Back to suggestions
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={enterCustomMode}
            className="self-start text-xs font-bold text-emerald hover:underline"
          >
            Or name your own space →
          </button>
        )}

        {fieldErrors.preset && <p className="text-xs font-semibold text-coral-deep">{fieldErrors.preset}</p>}
      </Card.Body>

      <Card.Footer divider={false} className="flex gap-2.5">
        <Action type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Action>
        <Action type="submit" variant="primary" disabled={!ready || submitting} className="ml-auto">
          {submitting ? 'Adding…' : 'Continue'}
        </Action>
      </Card.Footer>
    </form>
  )
}
