import { useId, useMemo, useState } from 'react'
import { ValidationError } from '../../errors/ValidationError'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useSpacePresets } from '../../hooks/useSpaces'
import type { Space, SpaceCategory, SpaceIcon, SpacePreset } from '../../types/space'
import { SPACE_ICON_OPTIONS } from '../../utils/spaceIcons'
import SegmentedControl from '../form/SegmentedControl'
import TextInput from '../form/TextInput'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import IconPicker from './IconPicker'
import PresetOptions from './PresetOptions'
import SpaceEnvFields, { initEnv, type SpaceEnv } from './SpaceEnvFields'

const EMPTY_SET: ReadonlySet<string> = new Set()

export type SpaceFormPayload = {
  name: string
  category: SpaceCategory
  icon: SpaceIcon
} & Partial<SpaceEnv>

type SpaceFormDialogProps = {
  open: boolean
  onClose: () => void
  // Step2Spaces' onAdd is synchronous (queues the custom space locally,
  // committed on the wizard step's own submit); House's onEdit awaits a
  // mutation. The submit handler `await`s either — a non-promise resolves
  // immediately — so both shapes are accepted here.
  onAdd?: (payload: SpaceFormPayload) => void | Promise<void>
  onEdit?: (id: number, payload: SpaceFormPayload) => void | Promise<void>
  space?: Space | null
  existingNames?: ReadonlySet<string>
  showEnvironment?: boolean
}

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
}: SpaceFormDialogProps) {
  const isEdit = Boolean(space)
  const title = isEdit ? 'Edit space' : 'Add a space'
  const submitLabel = isEdit ? 'Save' : 'Add space'

  const titleId = useId()
  const [name, setName] = useState(space?.name ?? '')
  const [category, setCategory] = useState<SpaceCategory>(space?.category ?? 'indoor')
  const [icon, setIcon] = useState<SpaceIcon | ''>(space?.icon ?? SPACE_ICON_OPTIONS[0].slug)
  const [env, setEnv] = useState<SpaceEnv>(() => initEnv(space))

  const { data: presets = [] } = useSpacePresets({ enabled: !isEdit })
  const availablePresets = useMemo(() => {
    if (isEdit) return []
    return presets.filter((preset) => !existingNames.has(preset.name))
  }, [isEdit, presets, existingNames])

  function applyPreset(preset: SpacePreset) {
    setName(preset.name)
    setCategory(preset.category)
    setIcon(preset.icon)
  }

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      const trimmed = name.trim()
      if (!trimmed) throw new ValidationError({ name: 'Name required.' })

      const isUnchangedName = isEdit && trimmed === space?.name
      if (!isUnchangedName && existingNames.has(trimmed)) {
        throw new ValidationError({ name: `"${trimmed}" is already in your list.` })
      }

      // `icon` state can hold '' (Space.icon's allow_blank case, carried over
      // unedited) — the cast only asserts the payload's shape, it doesn't
      // change what value ships, same as the untyped original.
      const payload: SpaceFormPayload = {
        name: trimmed,
        category,
        icon: icon as SpaceIcon,
        ...(showEnvironment ? env : {}),
      }
      if (isEdit && space) {
        // `isEdit` already guarantees `space` at runtime (it's `Boolean(space)`);
        // the extra check here is for the type checker, not new logic. The
        // explicit throw (rather than `onEdit?.(...)`) keeps the same "caller
        // that omits the prop this mode needs still throws" behaviour the
        // untyped original had via calling `undefined` directly.
        if (!onEdit) throw new Error('SpaceFormDialog: onEdit is required in edit mode')
        await onEdit(space.id, payload)
      } else {
        if (!onAdd) throw new Error('SpaceFormDialog: onAdd is required in add mode')
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
            <PresetOptions presets={availablePresets} activeName={name} onPick={applyPreset} />
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
            onChange={(value) => setCategory(value as SpaceCategory)}
            options={[
              { value: 'indoor', label: 'Indoor' },
              { value: 'outdoor', label: 'Outdoor' },
            ]}
          />

          <IconPicker value={icon} onChange={setIcon} />

          {showEnvironment && (
            <SpaceEnvFields
              env={env}
              onChange={(key, value) => setEnv((prev) => ({ ...prev, [key]: value }) as SpaceEnv)}
            />
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
