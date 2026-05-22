import { useId, useMemo, useState } from 'react'
import { ValidationError } from '../../errors/ValidationError'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useSpacePresets } from '../../hooks/useSpaces'
import { SPACE_ICON_OPTIONS } from '../../utils/spaceIcons'
import SegmentedControl from '../form/SegmentedControl'
import TextInput from '../form/TextInput'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import IconPicker from './IconPicker'
import PresetChips from './PresetChips'
import SpaceEnvFields, { initEnv } from './SpaceEnvFields'

const EMPTY_SET = new Set()

// Caller resets state by re-keying the component on the editing target
// (e.g. <SpaceFormDialog key={space?.id ?? 'new'} … />). Per React's
// modern idiom, key-driven remount avoids the open/space sync useEffect
// that would otherwise leak state between Add and Edit modes.
//
// `showEnvironment` defaults true. Onboarding's Step2 passes false
// because Step4Environment walks env per-space afterwards — env
// segments here would be redundant in that flow.
export default function SpaceFormDialog({
  open,
  onClose,
  onAdd,
  onEdit,
  space = null,
  existingNames = EMPTY_SET,
  showEnvironment = true,
}) {
  const isEdit = Boolean(space)
  const title = isEdit ? 'Edit space' : 'Add a space'
  const submitLabel = isEdit ? 'Save' : 'Add space'

  const titleId = useId()
  const [name, setName] = useState(space?.name ?? '')
  const [category, setCategory] = useState(space?.category ?? 'indoor')
  const [icon, setIcon] = useState(space?.icon ?? SPACE_ICON_OPTIONS[0].slug)
  const [env, setEnv] = useState(() => initEnv(space))

  const { data: presets = [] } = useSpacePresets({ enabled: !isEdit })
  const availablePresets = useMemo(() => {
    if (isEdit) return []
    return presets.filter((preset) => !existingNames.has(preset.name))
  }, [isEdit, presets, existingNames])

  function applyPreset(preset) {
    setName(preset.name)
    setCategory(preset.category)
    setIcon(preset.icon)
  }

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      const trimmed = name.trim()
      if (!trimmed) throw new ValidationError({ name: 'Name required.' })

      const isUnchangedName = isEdit && trimmed === space.name
      if (!isUnchangedName && existingNames.has(trimmed)) {
        throw new ValidationError({ name: `"${trimmed}" is already in your list.` })
      }

      const payload = { name: trimmed, category, icon, ...(showEnvironment ? env : {}) }
      if (isEdit) {
        await onEdit(space.id, payload)
      } else {
        await onAdd(payload)
      }
      onClose()
    },
    errorMessage: isEdit ? "Couldn't save space" : "Couldn't add space",
  })

  return (
    <Dialog open={open} onClose={onClose} title={title} ariaLabelledBy={titleId} className="!max-w-2xl">
      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Header divider={false}>
          <p id={titleId} className="text-lg font-extrabold text-ink">
            {title}
          </p>
        </Card.Header>

        <Card.Body className="flex flex-col gap-4">
          {availablePresets.length > 0 && (
            <PresetChips presets={availablePresets} activeName={name} onPick={applyPreset} />
          )}

          <TextInput
            label="Name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Garage, Loft, Greenhouse…"
            error={fieldErrors.name}
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

          {showEnvironment && (
            <SpaceEnvFields env={env} onChange={(key, value) => setEnv((prev) => ({ ...prev, [key]: value }))} />
          )}
        </Card.Body>

        <Card.Footer divider={false} className="flex gap-2.5">
          <Action variant="secondary" onClick={onClose} disabled={submitting} type="button">
            Cancel
          </Action>
          <Action variant="primary" type="submit" disabled={!name.trim() || submitting} className="ml-auto">
            {submitting ? 'Saving…' : submitLabel}
          </Action>
        </Card.Footer>
      </form>
    </Dialog>
  )
}
