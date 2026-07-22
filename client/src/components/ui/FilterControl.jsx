import { faFilter } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState } from 'react'
import { useFilterDraft } from '../../hooks/useFilterDraft'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { countActive } from '../../utils/filterSchema'
import Action from './Action'
import Card from './Card'
import Dialog from './Dialog'
import Popover from './Popover'

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

// The panel body is identical either side of the mobile split; only the
// chrome around it differs, so the draft lives here and both branches
// render the same fields.
function FilterPanel({ schema, filters, title, renderFields, onApply, onClose, mobile }) {
  const form = useFilterDraft(filters, schema)
  const fields = renderFields(form)
  const actions = <FilterActions onReset={form.reset} onCancel={onClose} onApply={() => onApply(form.draft)} />

  if (mobile) {
    return (
      <>
        <Card.Header divider={false}>
          <p className="text-lg font-extrabold text-ink">{title}</p>
        </Card.Header>
        <Card.Body className="flex flex-col gap-3 py-1">{fields}</Card.Body>
        <Card.Footer divider={false} className="flex items-center gap-2.5 pt-3 [&>:first-child]:mr-auto">
          {actions}
        </Card.Footer>
      </>
    )
  }

  return (
    <>
      {fields}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-paper-edge">{actions}</div>
    </>
  )
}

// Generic filter chrome: trigger pill with active count, a chip-row slot,
// and a popover (desktop) / dialog (mobile) panel that edits a draft and
// hands it back on Apply. Domain code supplies the schema, the fields and
// the chip row; this owns none of that vocabulary.
export default function FilterControl({
  schema,
  filters,
  hiddenAxisIds = [],
  title,
  onApply,
  renderFields,
  surface = 'glass',
  children,
}) {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const buttonRef = useRef(null)

  const activeCount = countActive(filters, schema, hiddenAxisIds)
  const buttonClass = activeCount > 0 ? 'bg-mint text-emerald' : 'bg-paper-deep text-ink-soft hover:bg-paper-edge'

  function commitDraft(draft) {
    onApply(draft)
    setOpen(false)
  }

  function handleClose({ reason } = {}) {
    setOpen(false)
    if (reason === 'escape') buttonRef.current?.focus()
  }

  const panel = (
    <FilterPanel
      schema={schema}
      filters={filters}
      title={title}
      renderFields={renderFields}
      onApply={commitDraft}
      onClose={handleClose}
      mobile={isMobile}
    />
  )

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      <Action
        ref={buttonRef}
        variant="unstyled"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 ease-out ${buttonClass}`}
      >
        <FontAwesomeIcon icon={faFilter} className="w-3 h-3" aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold bg-emerald text-paper">
            {activeCount}
          </span>
        )}
      </Action>

      {children}

      {isMobile ? (
        <Dialog open={open} onClose={handleClose} title={title}>
          {panel}
        </Dialog>
      ) : (
        <Popover
          open={open}
          onClose={handleClose}
          anchorRef={buttonRef}
          role="dialog"
          label={title}
          placement="bottom-left"
          surface={surface}
          autoFocus
          modal
          className="w-[340px] max-w-[calc(100vw-1.5rem)] p-4"
        >
          {panel}
        </Popover>
      )}
    </div>
  )
}
