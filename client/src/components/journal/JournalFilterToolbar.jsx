import { faFilter } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { memo, useCallback, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { usePlants } from '../../hooks/usePlants'
import Action from '../ui/Action'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import Heading from '../ui/Heading'
import Popover from '../ui/Popover'

export const JOURNAL_KINDS = ['water', 'feed', 'photo', 'achievement', 'acquisition']

const KIND_LABEL = {
  water: 'Water',
  feed: 'Feed',
  photo: 'Photos',
  achievement: 'Achievements',
  acquisition: 'Acquisitions',
}

const KIND_EMOJI = {
  water: '💧',
  feed: '🌱',
  photo: '📸',
  achievement: '🏆',
  acquisition: '🌿',
}

const CHIP_BASE = 'rounded-full text-[11px] font-bold transition-colors'
const CHIP_SELECTED = 'bg-emerald text-paper'
const CHIP_IDLE = 'bg-paper-deep text-ink-soft hover:bg-paper-edge'

const DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

const EMPTY_DRAFT = { plantIds: [], kinds: [], dateFrom: null, dateTo: null }

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function presetRange(preset) {
  if (preset.days == null) return { dateFrom: null, dateTo: null }
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - preset.days)
  return { dateFrom: isoDate(from), dateTo: isoDate(today) }
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function dateChipLabel(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return null
  if (dateFrom && dateTo) return `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
  if (dateFrom) return `From ${formatDateShort(dateFrom)}`
  return `Until ${formatDateShort(dateTo)}`
}

export function readJournalFilters(searchParams) {
  const plantIdsParam = searchParams.get('plant_ids')
  const kindsParam = searchParams.get('kinds')
  return {
    plantIds: plantIdsParam
      ? plantIdsParam
          .split(',')
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [],
    kinds: kindsParam ? kindsParam.split(',').filter((kind) => JOURNAL_KINDS.includes(kind)) : [],
    dateFrom: searchParams.get('date_from') || null,
    dateTo: searchParams.get('date_to') || null,
  }
}

function applyFilters(setSearchParams, next) {
  setSearchParams(
    (prev) => {
      const updated = new URLSearchParams(prev)
      if (next.plantIds.length) updated.set('plant_ids', next.plantIds.join(','))
      else updated.delete('plant_ids')
      if (next.kinds.length) updated.set('kinds', next.kinds.join(','))
      else updated.delete('kinds')
      if (next.dateFrom) updated.set('date_from', next.dateFrom)
      else updated.delete('date_from')
      if (next.dateTo) updated.set('date_to', next.dateTo)
      else updated.delete('date_to')
      return updated
    },
    { replace: false },
  )
}

const PLANT_THUMB_SIZE = {
  sm: { box: 'w-4 h-4', text: 'text-[10px]' },
  md: { box: 'w-5 h-5', text: 'text-[11px]' },
}

function CompactDateField({ label, value, onChange, min, max }) {
  const inputId = useId()
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1">
      <span className="eyebrow-label text-ink-softer">{label}</span>
      <input
        id={inputId}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={onChange}
        className="rounded-md border border-paper-edge bg-paper px-2 py-1 text-[11px] font-bold text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald/15"
      />
    </label>
  )
}

function PlantThumb({ src, size = 'md' }) {
  const recipe = PLANT_THUMB_SIZE[size] ?? PLANT_THUMB_SIZE.md
  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={`${recipe.box} rounded-full bg-paper inline-flex items-center justify-center shrink-0 ${recipe.text}`}
      >
        🌿
      </span>
    )
  }
  return <img src={src} alt="" className={`${recipe.box} rounded-full object-cover shrink-0`} />
}

function useFilterDraft(initialFilters) {
  const [draft, setDraft] = useState(initialFilters)
  const togglePlant = useCallback(
    (plantId) =>
      setDraft((current) => ({
        ...current,
        plantIds: current.plantIds.includes(plantId)
          ? current.plantIds.filter((value) => value !== plantId)
          : [...current.plantIds, plantId],
      })),
    [],
  )
  const toggleKind = useCallback(
    (kind) =>
      setDraft((current) => ({
        ...current,
        kinds: current.kinds.includes(kind)
          ? current.kinds.filter((value) => value !== kind)
          : [...current.kinds, kind],
      })),
    [],
  )
  const applyPreset = useCallback((preset) => setDraft((current) => ({ ...current, ...presetRange(preset) })), [])
  const setDateField = useCallback(
    (field, value) => setDraft((current) => ({ ...current, [field]: value || null })),
    [],
  )
  const reset = useCallback(() => setDraft(EMPTY_DRAFT), [])

  return useMemo(
    () => ({ draft, togglePlant, toggleKind, applyPreset, setDateField, reset }),
    [draft, togglePlant, toggleKind, applyPreset, setDateField, reset],
  )
}

const FilterFields = memo(function FilterFields({ plants, draft, togglePlant, toggleKind, applyPreset, setDateField }) {
  return (
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
              onClick={() => togglePlant(plant.id)}
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

      <Heading as="h5" variant="eyebrow" className="text-ink-softer mt-4 mb-2">
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
              onClick={() => toggleKind(kind)}
              aria-pressed={selected}
              className={`${CHIP_BASE} inline-flex items-center gap-1 px-2.5 py-1 ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
            >
              <span aria-hidden="true">{KIND_EMOJI[kind]}</span>
              {KIND_LABEL[kind]}
            </Action>
          )
        })}
      </div>

      <Heading as="h5" variant="eyebrow" className="text-ink-softer mt-4 mb-2">
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
              onClick={() => applyPreset(preset)}
              aria-pressed={selected}
              className={`${CHIP_BASE} inline-flex items-center px-2.5 py-1 ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
            >
              {preset.label}
            </Action>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <CompactDateField
          label="From"
          value={draft.dateFrom ?? ''}
          max={draft.dateTo ?? undefined}
          onChange={(event) => setDateField('dateFrom', event.target.value)}
        />
        <CompactDateField
          label="To"
          value={draft.dateTo ?? ''}
          min={draft.dateFrom ?? undefined}
          onChange={(event) => setDateField('dateTo', event.target.value)}
        />
      </div>
    </>
  )
})

function PopoverFilterPanel({ plants, initialFilters, onApply, onClose }) {
  const form = useFilterDraft(initialFilters)
  return (
    <>
      <FilterFields plants={plants} {...form} />
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-paper-edge">
        <Action
          variant="unstyled"
          type="button"
          onClick={form.reset}
          className="text-[11px] font-bold text-ink-softer hover:text-coral-deep"
        >
          Reset
        </Action>
        <div className="flex gap-2">
          <Action type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Action>
          <Action type="button" variant="primary" onClick={() => onApply(form.draft)}>
            Apply
          </Action>
        </div>
      </div>
    </>
  )
}

function DialogFilterPanel({ plants, initialFilters, onApply, onClose }) {
  const form = useFilterDraft(initialFilters)
  return (
    <>
      <Card.Header divider={false}>
        <p className="text-lg font-extrabold text-ink">Filter journal entries</p>
      </Card.Header>
      <Card.Body className="flex flex-col gap-3 py-1">
        <FilterFields plants={plants} {...form} />
      </Card.Body>
      <Card.Footer divider={false} className="flex items-center gap-2.5 pt-3">
        <Action
          variant="unstyled"
          type="button"
          onClick={form.reset}
          className="text-[11px] font-bold text-ink-softer hover:text-coral-deep mr-auto"
        >
          Reset
        </Action>
        <Action type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Action>
        <Action type="button" variant="primary" onClick={() => onApply(form.draft)}>
          Apply
        </Action>
      </Card.Footer>
    </>
  )
}

export default function JournalFilterToolbar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readJournalFilters(searchParams)
  const { data: plants } = usePlants()
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const buttonRef = useRef(null)

  const hasDate = Boolean(filters.dateFrom || filters.dateTo)
  const activeCount = filters.plantIds.length + filters.kinds.length + (hasDate ? 1 : 0)
  const anyActive = activeCount > 0
  const activePlants = filters.plantIds.map((id) => plants?.find((plant) => plant.id === id)).filter(Boolean)
  const dateLabel = dateChipLabel(filters.dateFrom, filters.dateTo)

  function clearAll() {
    applyFilters(setSearchParams, EMPTY_DRAFT)
  }

  function clearPlant(plantId) {
    applyFilters(setSearchParams, {
      ...filters,
      plantIds: filters.plantIds.filter((id) => id !== plantId),
    })
  }

  function clearKind(kind) {
    applyFilters(setSearchParams, { ...filters, kinds: filters.kinds.filter((value) => value !== kind) })
  }

  function clearDate() {
    applyFilters(setSearchParams, { ...filters, dateFrom: null, dateTo: null })
  }

  function commitDraft(draft) {
    applyFilters(setSearchParams, draft)
    setOpen(false)
  }

  function handleClose({ reason } = {}) {
    setOpen(false)
    if (reason === 'escape') buttonRef.current?.focus()
  }

  const buttonClass = anyActive ? 'bg-mint text-emerald' : 'bg-paper-deep text-ink-soft hover:bg-paper-edge'
  const buttonTransition = 'transition-colors duration-300 ease-out'

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      <Action
        ref={buttonRef}
        variant="unstyled"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${buttonTransition} ${buttonClass}`}
      >
        <FontAwesomeIcon icon={faFilter} className="w-3 h-3" aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold bg-emerald text-paper">
            {activeCount}
          </span>
        )}
      </Action>

      {activePlants.map((plant) => (
        <Badge
          key={`plant-${plant.id}`}
          scheme="emerald"
          size="sm"
          onClear={() => clearPlant(plant.id)}
          clearLabel={`Clear ${plant.nickname} filter`}
        >
          <PlantThumb src={plant.species?.image_url} size="sm" />
          <span className="truncate max-w-[140px]">{plant.nickname}</span>
        </Badge>
      ))}

      {filters.kinds.map((kind) => (
        <Badge
          key={`kind-${kind}`}
          scheme="emerald"
          size="sm"
          onClear={() => clearKind(kind)}
          clearLabel={`Remove ${KIND_LABEL[kind]} filter`}
        >
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-full bg-paper inline-flex items-center justify-center text-[10px] leading-none shrink-0"
          >
            {KIND_EMOJI[kind]}
          </span>
          {KIND_LABEL[kind]}
        </Badge>
      ))}

      {dateLabel && (
        <Badge scheme="emerald" size="sm" onClear={clearDate} clearLabel="Clear date filter">
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-full bg-paper inline-flex items-center justify-center text-[10px] leading-none shrink-0"
          >
            📅
          </span>
          {dateLabel}
        </Badge>
      )}

      {anyActive && (
        <Action
          variant="unstyled"
          type="button"
          onClick={clearAll}
          className="text-[11px] font-bold text-ink-softer underline decoration-dotted hover:text-coral-deep"
        >
          Clear all
        </Action>
      )}

      {isMobile ? (
        <Dialog open={open} onClose={handleClose} title="Filter journal entries">
          <DialogFilterPanel plants={plants} initialFilters={filters} onApply={commitDraft} onClose={handleClose} />
        </Dialog>
      ) : (
        <Popover
          open={open}
          onClose={handleClose}
          anchorRef={buttonRef}
          role="dialog"
          label="Filter journal entries"
          placement="bottom-left"
          surface="glass"
          autoFocus
          className="w-[340px] max-w-[calc(100vw-1.5rem)] p-4"
        >
          <PopoverFilterPanel plants={plants} initialFilters={filters} onApply={commitDraft} onClose={handleClose} />
        </Popover>
      )}
    </div>
  )
}
