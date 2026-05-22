import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useAddPlant } from '../../hooks/useAddPlant'
import { useSpacePresets } from '../../hooks/useSpaces'
import { getSpaceEmoji, SPACE_ICON_OPTIONS } from '../../utils/spaceIcons'
import SegmentedControl from '../form/SegmentedControl'
import TextInput from '../form/TextInput'
import Action from '../ui/Action'
import Card from '../ui/Card'
import WizardDialog from '../wizard/WizardDialog'
import IconPicker from './IconPicker'
import PresetChips from './PresetChips'
import SpaceEnvFields, { initEnv } from './SpaceEnvFields'

const EMPTY_SET = new Set()

// Two-step space-creation wizard for House (add only — edit stays the flat
// SpaceFormDialog). Identity → environment → create → optional add-plants
// hand-off to the global AddPlantDialog. Built on the generic WizardDialog.
//
// State resets via remount — House re-keys this on each open.
export default function AddSpaceDialog({ open, onClose, onAdd, existingNames = EMPTY_SET }) {
  const { open: openAddPlant } = useAddPlant()
  const toast = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('indoor')
  const [icon, setIcon] = useState(SPACE_ICON_OPTIONS[0].slug)
  const [env, setEnv] = useState(() => initEnv(null))

  const { data: presets = [] } = useSpacePresets({ enabled: open })
  const trimmed = name.trim()
  const availablePresets = presets.filter((preset) => !existingNames.has(preset.name))
  const nameError = trimmed && existingNames.has(trimmed) ? `"${trimmed}" is already in your list.` : null

  function applyPreset(preset) {
    setName(preset.name)
    setCategory(preset.category)
    setIcon(preset.icon)
  }

  async function handleComplete() {
    try {
      return await onAdd({ name: trimmed, category, icon, ...env })
    } catch {
      toast.error("Couldn't add space")
      return null
    }
  }

  const steps = [
    {
      title: 'Name your space',
      canContinue: Boolean(trimmed) && !nameError,
      content: () => (
        <>
          {availablePresets.length > 0 && (
            <PresetChips presets={availablePresets} activeName={name} onPick={applyPreset} />
          )}
          <TextInput
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Garage, Loft, Greenhouse…"
            error={nameError}
            autoFocus
          />
          <SegmentedControl
            label="Category"
            value={category}
            onChange={setCategory}
            options={[
              { value: 'indoor', label: 'Indoor' },
              { value: 'outdoor', label: 'Outdoor' },
            ]}
          />
          <IconPicker value={icon} onChange={setIcon} />
        </>
      ),
    },
    {
      title: 'Set the environment',
      continueLabel: 'Add space',
      content: () => (
        <SpaceEnvFields env={env} onChange={(key, value) => setEnv((prev) => ({ ...prev, [key]: value }))} />
      ),
    },
  ]

  return (
    <WizardDialog
      open={open}
      onClose={onClose}
      title="Add a space"
      steps={steps}
      onComplete={handleComplete}
      completion={(space) => (
        <>
          <Card.Body className="flex flex-col items-center text-center gap-2 py-4">
            <span className="text-5xl" aria-hidden="true">
              {getSpaceEmoji(space.icon)}
            </span>
            <p className="text-lg font-extrabold text-ink">{space.name} added</p>
            <p className="text-sm text-ink-soft">Want to add plants to it now?</p>
          </Card.Body>
          <Card.Footer divider={false} className="flex gap-2.5">
            <Action variant="secondary" onClick={onClose}>
              Done
            </Action>
            <Action
              variant="primary"
              className="ml-auto"
              onClick={() => {
                openAddPlant({ defaultSpaceId: space.id })
                onClose()
              }}
            >
              Add a plant
            </Action>
          </Card.Footer>
        </>
      )}
    />
  )
}
