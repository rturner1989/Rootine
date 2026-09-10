import { faLayerGroup } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useOrganiserContext } from '../../hooks/useOrganiserContext'
import Action from '../ui/Action'
import Tooltip from '../ui/Tooltip'

export type OrganiserTriggerSize = 'sm' | 'lg'

export type OrganiserTriggerProps = {
  size?: OrganiserTriggerSize
}

export default function OrganiserTrigger({ size = 'sm' }: OrganiserTriggerProps) {
  const { openDrawer } = useOrganiserContext()

  const dimensions = size === 'lg' ? 'w-9 h-9' : 'w-[26px] h-[26px]'
  const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'

  return (
    <Action
      variant="unstyled"
      onClick={openDrawer}
      aria-label="Open organiser"
      className={`${dimensions} relative group rounded-full bg-paper-deep text-ink-soft hover:text-ink hover:bg-mint/60 transition-colors flex items-center justify-center shrink-0`}
    >
      <FontAwesomeIcon icon={faLayerGroup} className={iconSize} />
      <Tooltip placement="bottom">Organiser</Tooltip>
    </Action>
  )
}
