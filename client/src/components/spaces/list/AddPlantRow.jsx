import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Action from '../../ui/Action'

export default function AddPlantRow({ onClick, spaceName }) {
  return (
    <Action
      variant="unstyled"
      onClick={onClick}
      aria-label={spaceName ? `Add a plant to ${spaceName}` : 'Add a plant'}
      className="w-full flex items-center gap-3 px-4 sm:px-[18px] py-3 border-b border-dashed border-emerald/25 bg-mint/40 hover:bg-mint/60 transition-colors text-emerald font-display italic text-[15px] text-left"
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-8 h-8 rounded-full bg-paper text-emerald flex items-center justify-center"
      >
        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
      </span>
      <span className="flex-1">Add a plant</span>
    </Action>
  )
}
