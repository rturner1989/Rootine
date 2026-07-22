import { useFilterDraft } from '../../../hooks/useFilterDraft'
import Action from '../../ui/Action'
import Card from '../../ui/Card'
import { JOURNAL_FILTER_SCHEMA } from './config'
import Fields from './Fields'

// Reset (left) + Cancel / Apply (right) — the action trio shared by both
// panel chromes.
function FilterActions({ onReset, onCancel, onApply }) {
  return (
    <>
      <Action
        variant="unstyled"
        type="button"
        onClick={onReset}
        className="text-[11px] font-bold text-ink-softer hover:text-coral-deep"
      >
        Reset
      </Action>
      <div className="flex gap-2">
        <Action type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Action>
        <Action type="button" variant="primary" onClick={onApply}>
          Apply
        </Action>
      </div>
    </>
  )
}

// Desktop popover body: bare fields + a divider footer.
export function PopoverFilterPanel({ plants, initialFilters, onApply, onClose, hidePlants, hideKinds }) {
  const form = useFilterDraft(initialFilters, JOURNAL_FILTER_SCHEMA)
  return (
    <>
      <Fields plants={plants} hidePlants={hidePlants} hideKinds={hideKinds} {...form} />
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-paper-edge">
        <FilterActions onReset={form.reset} onCancel={onClose} onApply={() => onApply(form.draft)} />
      </div>
    </>
  )
}

// Mobile dialog body: Card chrome around the same fields.
export function DialogFilterPanel({ plants, initialFilters, onApply, onClose, hidePlants, hideKinds }) {
  const form = useFilterDraft(initialFilters, JOURNAL_FILTER_SCHEMA)
  return (
    <>
      <Card.Header divider={false}>
        <p className="text-lg font-extrabold text-ink">Filter journal entries</p>
      </Card.Header>
      <Card.Body className="flex flex-col gap-3 py-1">
        <Fields plants={plants} hidePlants={hidePlants} hideKinds={hideKinds} {...form} />
      </Card.Body>
      <Card.Footer divider={false} className="flex items-center gap-2.5 pt-3 [&>:first-child]:mr-auto">
        <FilterActions onReset={form.reset} onCancel={onClose} onApply={() => onApply(form.draft)} />
      </Card.Footer>
    </>
  )
}
