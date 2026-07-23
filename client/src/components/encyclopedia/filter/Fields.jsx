import { memo } from 'react'
import Action from '../../ui/Action'
import Heading from '../../ui/Heading'
import { DIFFICULTY_OPTIONS, LIGHT_OPTIONS } from './config'

const CHIP_BASE = 'rounded-full text-[11px] font-bold transition-colors inline-flex items-center gap-1 px-2.5 py-1'
const CHIP_SELECTED = 'bg-emerald text-paper'
const CHIP_IDLE = 'bg-paper-deep text-ink-soft hover:bg-paper-edge'

// The three Encyclopedia filter sections — Pet safety (single toggle),
// Difficulty and Light (multi chips) — shared by the popover and dialog
// panels via FilterControl's renderFields slot.
const Fields = memo(function Fields({ draft, toggleValue, setValue }) {
  return (
    <>
      <Heading as="h5" variant="eyebrow" className="text-ink-softer mb-2">
        Pet safety
      </Heading>
      <Action
        variant="unstyled"
        type="button"
        role="switch"
        aria-checked={draft.petSafe === true}
        onClick={() => setValue('petSafe', draft.petSafe === true ? null : true)}
        className={`${CHIP_BASE} ${draft.petSafe === true ? CHIP_SELECTED : CHIP_IDLE}`}
      >
        <span aria-hidden="true">🐾</span>
        Pet-safe only
      </Action>

      <Heading as="h5" variant="eyebrow" className="text-ink-softer mb-2 mt-4">
        Difficulty
      </Heading>
      <div className="flex flex-wrap gap-1">
        {DIFFICULTY_OPTIONS.map((option) => renderChip('difficulty', option, draft, toggleValue))}
      </div>

      <Heading as="h5" variant="eyebrow" className="text-ink-softer mb-2 mt-4">
        Light
      </Heading>
      <div className="flex flex-wrap gap-1">
        {LIGHT_OPTIONS.map((option) => renderChip('light', option, draft, toggleValue))}
      </div>
    </>
  )
})

function renderChip(axisId, option, draft, toggleValue) {
  const selected = draft[axisId].includes(option.value)
  return (
    <Action
      key={option.value}
      variant="unstyled"
      type="button"
      onClick={() => toggleValue(axisId, option.value)}
      aria-pressed={selected}
      className={`${CHIP_BASE} ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
    >
      <span aria-hidden="true">{option.emoji}</span>
      {option.label}
    </Action>
  )
}

export default Fields
