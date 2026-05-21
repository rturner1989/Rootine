import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { usePhotoPicker } from '../../hooks/usePhotoPicker'
import { useLogCare } from '../../hooks/usePlants'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'
import Heading from '../ui/Heading'
import RadialWheel from '../ui/RadialWheel'
import { PLANT_ACTION_SPOKES } from './ActionWheel'
import Avatar from './Avatar'

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function formatLastCare(timestamp) {
  if (!timestamp) return 'Never logged'
  const days = Math.round((new Date(timestamp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  return RELATIVE.format(days, 'day')
}

export default function QuickDialog({ plant, open, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
  // Hold the last opened plant so the Dialog's exit animation can run
  // after the parent clears its active-plant state. Without this, the
  // component returns null mid-close and AnimatePresence skips the
  // exit choreography. Effect (not render-time mutation) for React 19
  // concurrent-mode safety.
  const lastPlantRef = useRef(plant)
  useEffect(() => {
    if (plant) lastPlantRef.current = plant
  }, [plant])
  const renderPlant = plant ?? lastPlantRef.current
  const logCare = useLogCare(renderPlant?.id)
  const { openPicker } = usePhotoPicker(renderPlant?.id)

  if (!renderPlant) return null
  const display = renderPlant

  function commitCare(careType, label, emoji) {
    logCare.mutate({ care_type: careType })
    toast.success(`${label} ${display.nickname} ${emoji}`)
    onClose?.()
  }

  function goToDetail() {
    onClose?.()
    navigate(`/plants/${display.id}`)
  }

  const isUrgent = display.water_status === 'overdue' || display.feed_status === 'overdue'

  const primaryAction =
    display.water_status === 'overdue'
      ? 'water'
      : display.feed_status === 'overdue'
        ? 'feed'
        : display.water_status === 'due_today'
          ? 'water'
          : display.feed_status === 'due_today'
            ? 'feed'
            : null

  const spokes = PLANT_ACTION_SPOKES.map((spoke) => ({ ...spoke, primary: spoke.id === primaryAction }))

  function handleSpoke(spokeId) {
    if (spokeId === 'water') {
      commitCare('watering', 'Watered', '💧')
      return
    }
    if (spokeId === 'feed') {
      commitCare('feeding', 'Fed', '🌱')
      return
    }
    if (spokeId === 'photo') {
      openPicker()
      return
    }
    if (spokeId === 'doctor') {
      onClose?.()
      navigate(`/plants/${display.id}`)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={display.nickname} cardVariant="paper-warm">
      <Card.Header divider={false} className="flex items-center gap-3">
        <span
          className={`relative w-[62px] h-[62px] rounded-full plant-portrait ${isUrgent ? 'plant-portrait-urgent' : ''} flex items-center justify-center shrink-0`}
        >
          <span className="relative z-[2]">
            <Avatar species={display.species} size="lg" shape="circle" />
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-softer">
            {display.species?.common_name ?? 'Unknown species'}
          </p>
          <Heading as="h3" variant="panel" className="text-ink leading-tight">
            {display.nickname}
          </Heading>
        </div>
      </Card.Header>

      <Card.Body className="!flex-none flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <StatusCell
            label="Water"
            status={display.water_status}
            daysUntil={display.days_until_water}
            lastAt={display.last_watered_at}
          />
          <StatusCell
            label="Feed"
            status={display.feed_status}
            daysUntil={display.days_until_feed}
            lastAt={display.last_fed_at}
          />
        </dl>

        <div className="flex justify-center">
          <RadialWheel
            size="md"
            showOrbit
            urgent={primaryAction === 'water' || primaryAction === 'feed'}
            spokes={spokes}
            onSpoke={handleSpoke}
            open
            onOpenChange={() => {}}
            centreLabel={display.nickname}
            centreSlot={
              <span
                className={`relative w-[100px] h-[100px] rounded-full plant-portrait ${isUrgent ? 'plant-portrait-urgent' : ''} flex items-center justify-center`}
              >
                <span className="relative z-[2]">
                  <Avatar species={display.species} size="2xl" shape="circle" />
                </span>
              </span>
            }
          />
        </div>
      </Card.Body>

      <Card.Footer divider={false}>
        <Action
          variant="unstyled"
          onClick={goToDetail}
          className="block w-full text-center text-xs font-bold text-emerald"
        >
          Open full detail <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 ml-0.5" />
        </Action>
      </Card.Footer>
    </Dialog>
  )
}

const STATUS_CLASS = {
  overdue: 'bg-coral/15 text-coral-deep',
  due_today: 'bg-sunshine/20 text-sunshine-deep',
  due_soon: 'bg-mint text-emerald',
  healthy: 'bg-mint text-emerald',
  unknown: 'bg-paper-deep text-ink-softer',
}

const STATUS_LABEL = {
  overdue: 'Overdue',
  due_today: 'Due today',
  due_soon: 'Soon',
  healthy: 'Healthy',
  unknown: 'Unknown',
}

function StatusCell({ label, status, daysUntil, lastAt }) {
  const tone = STATUS_CLASS[status] ?? STATUS_CLASS.unknown
  const detail = formatDetail(status, daysUntil)

  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 rounded-md bg-paper-deep/40 border border-paper-edge/40">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-softer">{label}</span>
      <span className={`inline-block w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${tone}`}>
        {STATUS_LABEL[status] ?? STATUS_LABEL.unknown}
      </span>
      {detail ? <span className="text-[11px] text-ink-soft">{detail}</span> : null}
      <span className="text-[11px] italic text-ink-softer">Last {formatLastCare(lastAt)}</span>
    </div>
  )
}

function formatDetail(status, daysUntil) {
  if (daysUntil == null) return null
  if (status === 'overdue') return `${Math.abs(daysUntil)} days overdue`
  if (status === 'due_today') return 'Due today'
  if (status === 'due_soon') return `Due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
  return `Next in ${daysUntil} days`
}
