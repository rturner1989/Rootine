import { useEffect, useMemo, useState } from 'react'
import { request } from '../../api/client'
import { ValidationError } from '../../errors/ValidationError'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useCreatePlant } from '../../hooks/usePlants'
import { useSpaces } from '../../hooks/useSpaces'
import type { Plant } from '../../types/plant'
import { type SpeciesIndexResult, speciesSchema } from '../../types/species'
import { todayISO } from '../../utils/dateInput'
import { formatSpaceName, getSpaceEmoji } from '../../utils/spaceIcons'
import DateInput from '../form/DateInput'
import Select from '../form/Select'
import TextInput from '../form/TextInput'
import Action from '../ui/Action'
import Card from '../ui/Card'

export type StepDetailsProps = {
  species: SpeciesIndexResult | null
  defaultSpaceId?: number | null
  onBack: () => void
  onSubmitSuccess: (plant: Plant) => void
}

export default function StepDetails({ species, defaultSpaceId = null, onBack, onSubmitSuccess }: StepDetailsProps) {
  const { data: spaces = [] } = useSpaces()
  const createPlant = useCreatePlant()

  const activeSpaces = useMemo(() => spaces.filter((space) => !space.archived_at), [spaces])

  const initialSpaceId = useMemo(() => {
    if (defaultSpaceId && activeSpaces.some((space) => space.id === defaultSpaceId)) return defaultSpaceId
    if (activeSpaces.length === 1) return activeSpaces[0].id
    return null
  }, [defaultSpaceId, activeSpaces])

  const today = todayISO()
  // `feeding_frequency_days` only exists on the cached Species shape — a
  // freshly-picked Perenual search result (id: null) doesn't carry it, so
  // this reads as false for those the same way the untyped property access
  // did (accessing a field a plain object doesn't have yields undefined).
  const speciesFeeds = Boolean(species && species.id !== null && species.feeding_frequency_days)

  const [nickname, setNickname] = useState(species?.common_name ?? '')
  const [chosenSpaceId, setChosenSpaceId] = useState<number | null>(initialSpaceId)
  const [lastWateredAt, setLastWateredAt] = useState(today)
  const [lastFedAt, setLastFedAt] = useState(today)

  // Auto-pick the only available space once it loads. The initial
  // useState ran with an empty list when StepDetails mounted before
  // useSpaces settled — this effect catches the post-mount arrival.
  // Don't list `chosenSpaceId` as a dep: the inner condition guards
  // against re-set, and including it would re-fire the effect on every
  // user change to the picker (the read is fine stale).
  // biome-ignore lint/correctness/useExhaustiveDependencies: chosenSpaceId read is intentionally stale — see comment above
  useEffect(() => {
    if (chosenSpaceId == null && initialSpaceId != null) {
      setChosenSpaceId(initialSpaceId)
    }
  }, [initialSpaceId])

  const lockedSpace = defaultSpaceId == null ? null : activeSpaces.find((space) => space.id === defaultSpaceId)

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      // Unreachable in practice — AddPlantDialog only mounts this step
      // after handlePick has set a species and advanced past step 0.
      if (!species) return

      const trimmed = nickname.trim()
      if (!trimmed) throw new ValidationError({ nickname: 'Pick a nickname for your plant.' })
      if (!chosenSpaceId) throw new ValidationError({ space: 'Pick a space for this plant.' })
      if (!lastWateredAt) throw new ValidationError({ last_watered_at: 'Pick when you last watered.' })
      if (speciesFeeds && !lastFedAt) throw new ValidationError({ last_fed_at: 'Pick when you last fed.' })

      // Perenual results arrive with id=null. Hydrate via the show endpoint
      // first — the controller persists the Perenual row on first call.
      let resolvedSpecies: SpeciesIndexResult = species
      if (resolvedSpecies.id === null) {
        const params = new URLSearchParams({
          perenual_id: String(resolvedSpecies.perenual_id),
          common_name: resolvedSpecies.common_name ?? '',
          scientific_name: resolvedSpecies.scientific_name ?? '',
          image_url: resolvedSpecies.image_url ?? '',
        })
        // Same show action + community:true payload the Species#show
        // "?perenual_id=" branch renders — see species_controller.rb.
        resolvedSpecies = await request(`/api/v1/species/${resolvedSpecies.perenual_id}?${params}`, speciesSchema)
      }
      const plant = await createPlant.mutateAsync({
        species_id: resolvedSpecies.id,
        space_id: chosenSpaceId,
        nickname: trimmed,
        last_watered_at: lastWateredAt,
        last_fed_at: speciesFeeds ? lastFedAt : null,
      })
      onSubmitSuccess(plant)
    },
    errorMessage: "Couldn't add that plant",
  })

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
      <Card.Body className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
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

        {lockedSpace && (
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
            Adding to <span aria-hidden="true">{getSpaceEmoji(lockedSpace.icon)}</span>{' '}
            <span className="text-ink normal-case tracking-normal font-display italic text-sm">
              {formatSpaceName(lockedSpace.name)}
            </span>
          </p>
        )}

        <TextInput
          label="Nickname"
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Monty, Spike, Basil…"
          error={fieldErrors.nickname}
          autoFocus
        />

        {defaultSpaceId == null && activeSpaces.length > 1 && (
          <Select
            label="Space"
            value={chosenSpaceId ?? ''}
            onChange={(event) => setChosenSpaceId(Number(event.target.value))}
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
        <Action variant="secondary" onClick={onBack} disabled={submitting} type="button">
          Back
        </Action>
        <Action variant="primary" type="submit" disabled={!nickname.trim() || submitting} className="ml-auto">
          {submitting ? 'Adding…' : 'Add plant'}
        </Action>
      </Card.Footer>
    </form>
  )
}
