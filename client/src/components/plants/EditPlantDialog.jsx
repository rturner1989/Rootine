import { faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useId, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { ValidationError } from '../../errors/ValidationError'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useUpdatePlant } from '../../hooks/usePlants'
import { useSpaces } from '../../hooks/useSpaces'
import Select from '../form/Select'
import Textarea from '../form/Textarea'
import TextInput from '../form/TextInput'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'

const TITLE = 'Edit plant'

export default function EditPlantDialog({ plant, open, onClose, onDeleteRequest }) {
  const toast = useToast()
  const titleId = useId()
  const updatePlant = useUpdatePlant()
  const { data: spaces = [] } = useSpaces()

  const [nickname, setNickname] = useState(plant?.nickname ?? '')
  const [spaceId, setSpaceId] = useState(plant?.space_id ?? null)
  const [notes, setNotes] = useState(plant?.notes ?? '')

  // Re-seed form whenever a different plant is opened or the dialog
  // re-opens after a previous edit. Depend on plant.id (not the whole
  // object) so a TanStack refetch of the same plant mid-edit doesn't
  // overwrite the user's in-flight changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: id-based dep is intentional — see comment above
  useEffect(() => {
    if (open && plant) {
      setNickname(plant.nickname ?? '')
      setSpaceId(plant.space_id ?? null)
      setNotes(plant.notes ?? '')
    }
  }, [open, plant?.id])

  const activeSpaces = spaces.filter((space) => !space.archived_at || space.id === plant?.space_id)

  const dirty =
    plant != null &&
    (nickname.trim() !== (plant.nickname ?? '').trim() ||
      spaceId !== plant.space_id ||
      (notes ?? '') !== (plant.notes ?? ''))

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      const trimmed = nickname.trim()
      if (!trimmed) throw new ValidationError({ nickname: 'Pick a nickname for your plant.' })
      if (!spaceId) throw new ValidationError({ space: 'Pick a space for this plant.' })

      const updated = await updatePlant.mutateAsync({
        id: plant.id,
        nickname: trimmed,
        space_id: spaceId,
        notes: notes.trim() || null,
      })
      toast.success(`Saved ${updated.nickname}`)
      onClose()
    },
    errorMessage: "Couldn't save those changes",
  })

  if (!plant) return null

  return (
    <Dialog open={open} onClose={onClose} title={TITLE} ariaLabelledBy={titleId}>
      <Card.Header divider={false}>
        <p id={titleId} className="text-lg font-extrabold text-ink">
          {TITLE}
        </p>
      </Card.Header>

      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Body className="flex flex-col gap-4">
          <TextInput
            label="Nickname"
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            error={fieldErrors.nickname}
            autoFocus
          />

          <Select
            label="Space"
            value={spaceId ?? ''}
            onChange={(event) => setSpaceId(Number(event.target.value))}
            error={fieldErrors.space}
          >
            <option value="" disabled>
              Pick a space…
            </option>
            {activeSpaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </Select>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything worth remembering…"
            rows={3}
          />
        </Card.Body>

        <Card.Footer divider={false} className="flex items-center gap-2.5">
          {onDeleteRequest && (
            <Action
              type="button"
              variant="unstyled"
              onClick={onDeleteRequest}
              className="text-sm font-bold text-coral-deep hover:underline"
            >
              <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" className="w-3 h-3" /> Delete plant
            </Action>
          )}
          <Action type="button" variant="secondary" onClick={onClose} disabled={submitting} className="ml-auto">
            Cancel
          </Action>
          <Action type="submit" variant="primary" disabled={!dirty || submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Action>
        </Card.Footer>
      </form>
    </Dialog>
  )
}
