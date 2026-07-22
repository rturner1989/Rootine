import { memo } from 'react'
import DateInput from '../../form/DateInput'
import Action from '../../ui/Action'
import Heading from '../../ui/Heading'
import { DATE_PRESETS, JOURNAL_KINDS, KIND_EMOJI, KIND_LABEL, presetRange } from './config'
import PlantThumb from './PlantThumb'

const CHIP_BASE = 'rounded-full text-[11px] font-bold transition-colors'
const CHIP_SELECTED = 'bg-emerald text-paper'
const CHIP_IDLE = 'bg-paper-deep text-ink-soft hover:bg-paper-edge'

// The three filter sections — Plants / Event types / Date — shared by the
// popover and dialog panels. `hidePlants` (Plant Detail journal) and
// `hideKinds` (Photos tab) drop the irrelevant sections.
const Fields = memo(function Fields({ plants, draft, toggleValue, setValue, hidePlants = false, hideKinds = false }) {
  function handlePreset(preset) {
    const range = presetRange(preset)
    setValue('dateFrom', range.dateFrom)
    setValue('dateTo', range.dateTo)
  }

  return (
    <>
      {!hidePlants && (
        <>
          <Heading as="h5" variant="eyebrow" className="text-ink-softer mb-2">
            Plants
          </Heading>
          <div className="flex flex-wrap gap-1">
            {(plants ?? []).map((plant) => {
              const selected = draft.plantIds.includes(plant.id)
              return (
                <Action
                  key={plant.id}
                  variant="unstyled"
                  type="button"
                  onClick={() => toggleValue('plantIds', plant.id)}
                  aria-pressed={selected}
                  className={`${CHIP_BASE} inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
                >
                  <PlantThumb src={plant.species?.image_url} />
                  <span className="truncate max-w-[120px]">{plant.nickname}</span>
                </Action>
              )
            })}
            {plants?.length === 0 && <span className="text-xs text-ink-softer italic">No plants yet</span>}
          </div>
        </>
      )}

      {!hideKinds && (
        <>
          <Heading as="h5" variant="eyebrow" className={`text-ink-softer mb-2 ${hidePlants ? '' : 'mt-4'}`}>
            Event types
          </Heading>
          <div className="flex flex-wrap gap-1">
            {JOURNAL_KINDS.map((kind) => {
              const selected = draft.kinds.includes(kind)
              return (
                <Action
                  key={kind}
                  variant="unstyled"
                  type="button"
                  onClick={() => toggleValue('kinds', kind)}
                  aria-pressed={selected}
                  className={`${CHIP_BASE} inline-flex items-center gap-1 px-2.5 py-1 ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
                >
                  <span aria-hidden="true">{KIND_EMOJI[kind]}</span>
                  {KIND_LABEL[kind]}
                </Action>
              )
            })}
          </div>
        </>
      )}

      <Heading as="h5" variant="eyebrow" className={`text-ink-softer mb-2 ${hidePlants && hideKinds ? '' : 'mt-4'}`}>
        Date
      </Heading>
      <div className="flex flex-wrap gap-1">
        {DATE_PRESETS.map((preset) => {
          const range = presetRange(preset)
          const selected = (draft.dateFrom ?? null) === range.dateFrom && (draft.dateTo ?? null) === range.dateTo
          return (
            <Action
              key={preset.id}
              variant="unstyled"
              type="button"
              onClick={() => handlePreset(preset)}
              aria-pressed={selected}
              className={`${CHIP_BASE} inline-flex items-center px-2.5 py-1 ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
            >
              {preset.label}
            </Action>
          )
        })}
      </div>
      <div className="grid grid-cols-1 gap-2 mt-2">
        <DateInput
          label="From"
          size="sm"
          value={draft.dateFrom ?? ''}
          max={draft.dateTo ?? undefined}
          onChange={(event) => setValue('dateFrom', event.target.value)}
        />
        <DateInput
          label="To"
          size="sm"
          value={draft.dateTo ?? ''}
          min={draft.dateFrom ?? undefined}
          onChange={(event) => setValue('dateTo', event.target.value)}
        />
      </div>
    </>
  )
})

export default Fields
