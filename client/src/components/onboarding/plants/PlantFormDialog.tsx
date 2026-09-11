import { useId, useState } from 'react'
import { ValidationError } from '../../../errors/ValidationError'
import { useFormSubmit } from '../../../hooks/useFormSubmit'
import type { Space } from '../../../types/space'
import type { SpeciesIndexResult } from '../../../types/species'
import { todayISO } from '../../../utils/dateInput'
import DateInput from '../../form/DateInput'
import Select from '../../form/Select'
import TextInput from '../../form/TextInput'
import Action from '../../ui/Action'
import Card from '../../ui/Card'
import Dialog from '../../ui/Dialog'

const TITLE = 'Add a plant'

const EMPTY_SET: ReadonlySet<string> = new Set()

export type PlantFormSubmission = {
  species: SpeciesIndexResult
  nickname: string
  spaceId: number
  lastWateredAt: string
  lastFedAt: string | null
}

type PlantFormDialogProps = {
  open: boolean
  onClose: () => void
  onAdd: (submission: PlantFormSubmission) => Promise<void>
  species: SpeciesIndexResult | null
  availableSpaces?: Space[]
  existingNicknames?: ReadonlySet<string>
}

// Caller resets state by re-keying on the species (e.g.
// `<PlantFormDialog key={species?.id ?? 'none'} … />`). Per React's
// modern idiom, key-driven remount avoids a sync useEffect that
// would otherwise leak nickname/space between picks.
export default function PlantFormDialog({
  open,
  onClose,
  onAdd,
  species,
  availableSpaces = [],
  existingNicknames = EMPTY_SET,
}: PlantFormDialogProps) {
  const titleId = useId()
  const today = todayISO()
  // `species` from SpeciesPicker can be an unhydrated Perenual search
  // result (SpeciesSearchResult) — that shape never carries
  // feeding_frequency_days, so the cast mirrors the untyped original:
  // property access on a search result yields undefined, same as here.
  const speciesFeeds = Boolean((species as { feeding_frequency_days?: number | null } | null)?.feeding_frequency_days)
  const autoPickedSpaceId = availableSpaces.length === 1 ? availableSpaces[0].id : null
  const [nickname, setNickname] = useState(species?.common_name ?? '')
  const [chosenSpaceId, setChosenSpaceId] = useState<number | null>(autoPickedSpaceId)
  const [lastWateredAt, setLastWateredAt] = useState(today)
  const [lastFedAt, setLastFedAt] = useState(today)

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      if (!species) return
      const trimmed = nickname.trim()
      if (!trimmed) throw new ValidationError({ nickname: 'Pick a nickname for your plant.' })
      if (existingNicknames.has(trimmed)) {
        throw new ValidationError({ nickname: `"${trimmed}" is already in your list — pick a different name.` })
      }
      if (!chosenSpaceId) throw new ValidationError({ space: 'Pick a space for this plant.' })
      if (!lastWateredAt) throw new ValidationError({ last_watered_at: 'Pick when you last watered.' })
      if (speciesFeeds && !lastFedAt) throw new ValidationError({ last_fed_at: 'Pick when you last fed.' })

      await onAdd({
        species,
        nickname: trimmed,
        spaceId: chosenSpaceId,
        lastWateredAt,
        lastFedAt: speciesFeeds ? lastFedAt : null,
      })
      onClose()
    },
    errorMessage: "Couldn't add that plant",
  })

  return (
    <Dialog open={open} onClose={onClose} title={TITLE} ariaLabelledBy={titleId}>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 min-h-0">
        <Card.Header divider={false}>
          <p id={titleId} className="text-lg font-extrabold text-ink">
            {TITLE}
          </p>
        </Card.Header>

        <Card.Body className="!flex-none flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {/* Neither Species nor SpeciesSearchResult carries an `icon`
                field (confirmed against species.rb) — this was always
                the fallback emoji, never a real per-species glyph. */}
            <span className="text-3xl shrink-0" aria-hidden="true">
              🌿
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink truncate">{species?.common_name}</div>
              {species?.scientific_name && (
                <div className="font-display italic text-xs text-ink-soft truncate">{species.scientific_name}</div>
              )}
            </div>
          </div>

          <TextInput
            label="Nickname"
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Monty, Spike, Basil…"
            error={fieldErrors.nickname}
            autoFocus
          />

          {availableSpaces.length > 1 && (
            <Select
              label="Space"
              value={chosenSpaceId ?? ''}
              onChange={(event) => setChosenSpaceId(Number(event.target.value))}
              error={fieldErrors.space}
            >
              <option value="" disabled>
                Pick a space…
              </option>
              {availableSpaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </Select>
          )}

          <DateInput
            label="When did you last water?"
            value={lastWateredAt}
            onChange={(event) => setLastWateredAt(event.target.value)}
            max={today}
            required
            error={fieldErrors.last_watered_at}
          />

          {speciesFeeds && (
            <DateInput
              label="When did you last feed?"
              value={lastFedAt}
              onChange={(event) => setLastFedAt(event.target.value)}
              max={today}
              required
              error={fieldErrors.last_fed_at}
            />
          )}
        </Card.Body>

        <Card.Footer divider={false} className="flex gap-2.5">
          <Action variant="secondary" onClick={onClose} disabled={submitting} type="button">
            Cancel
          </Action>
          <Action variant="primary" type="submit" disabled={!nickname.trim() || submitting} className="ml-auto">
            {submitting ? 'Adding…' : 'Add plant'}
          </Action>
        </Card.Footer>
      </form>
    </Dialog>
  )
}
