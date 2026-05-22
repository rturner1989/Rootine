import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Action from '../../ui/Action'

export default function AddSpaceRow({ onClick }) {
  return (
    <Action
      variant="unstyled"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 sm:px-[18px] py-3.5 border-b-2 border-dashed border-emerald/25 bg-lime/[0.06] hover:bg-lime/[0.12] transition-colors text-emerald font-display italic text-[15px] text-left"
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-8 h-8 rounded-full bg-mint text-emerald flex items-center justify-center"
      >
        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
      </span>
      <span className="flex-1">Add a space</span>
      <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink-softer not-italic font-sans">
        Indoor or outdoor
      </span>
    </Action>
  )
}
