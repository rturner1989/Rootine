import {
  faClock,
  faEllipsisVertical,
  faLocationDot,
  faPenToSquare,
  faSeedling,
  faStethoscope,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, useTransition } from 'react'
import { useParams } from 'react-router-dom'
import SegmentedControl from '../components/form/SegmentedControl'
import Journal from '../components/Journal'
import { PLANT_ACTION_SPOKES } from '../components/plants/ActionWheel'
import PlantAvatar from '../components/plants/Avatar'
import CareRingsRow from '../components/plants/CareRingsRow'
import CareView from '../components/plants/CareView'
import DeletePlantDialog from '../components/plants/DeletePlantDialog'
import EditPlantDialog from '../components/plants/EditPlantDialog'
import LogCareDialog from '../components/plants/LogCareDialog'
import SpeciesView from '../components/plants/SpeciesView'
import Action from '../components/ui/Action'
import Badge from '../components/ui/Badge'
import Breadcrumb from '../components/ui/Breadcrumb'
import ErrorState from '../components/ui/errors/ErrorState'
import Heading from '../components/ui/Heading'
import Menu from '../components/ui/Menu'
import Quote from '../components/ui/Quote'
import RadialWheel from '../components/ui/RadialWheel'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../context/ToastContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { usePlant } from '../hooks/usePlants'
import { useSpecies } from '../hooks/useSpecies'
import { getPlantHeroQuote } from '../personality/heroQuotes'
import { pluralize } from '../utils/pluralize'

function ageLabel(plant) {
  const anchor = plant.acquired_at ?? plant.created_at
  if (!anchor) return null
  const days = Math.floor((Date.now() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24))
  if (days < 7) return `${pluralize(days || 1, 'day')} with you`
  if (days < 60) {
    const weeks = Math.floor(days / 7)
    return `${pluralize(weeks, 'week')} with you`
  }
  const months = Math.floor(days / 30)
  return `${pluralize(months, 'month')} with you`
}

function primaryActionFor(plant) {
  if (plant.water_status === 'overdue') return 'water'
  if (plant.feed_status === 'overdue') return 'feed'
  if (plant.water_status === 'due_today') return 'water'
  if (plant.feed_status === 'due_today') return 'feed'
  return null
}

export default function Plant() {
  const { id } = useParams()
  const toast = useToast()
  const { data: plant, isLoading, error } = usePlant(id)
  const [view, setView] = useState('care')
  const [, startViewTransition] = useTransition()
  const [activeDialog, setActiveDialog] = useState(null)
  const [logDefaultCareType, setLogDefaultCareType] = useState('watering')
  const { data: liveSpecies, isFetching: speciesFetching } = useSpecies(plant?.species?.id, {
    enabled: view === 'species',
  })
  const species = liveSpecies ?? plant?.species
  const { openPicker } = usePhotoPicker(plant?.id)
  // The lg wheel (440px) overflows a phone viewport — drop to md (320px)
  // and scale the portrait/avatar to match below the tablet breakpoint.
  const compact = useMediaQuery('(max-width: 767px)')

  function handleViewChange(next) {
    startViewTransition(() => setView(next))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50dvh]">
        <Spinner />
      </div>
    )
  }

  if (error || !plant) {
    return (
      <ErrorState
        scheme="404"
        title={
          <>
            That plant isn't <em>in your greenhouse</em>
          </>
        }
        description="It may have been removed, or the link is wrong. Pick somewhere else to go."
        actions={[
          <Action key="today" variant="primary" to="/">
            Back to Today
          </Action>,
          <Action key="house" variant="secondary" to="/house">
            Open House
          </Action>,
        ]}
      />
    )
  }

  const isUrgent = plant.water_status === 'overdue' || plant.feed_status === 'overdue'
  const primary = primaryActionFor(plant)
  const spokes = PLANT_ACTION_SPOKES.map((spoke) => ({ ...spoke, primary: spoke.id === primary }))

  function openLogDialog(type) {
    setLogDefaultCareType(type)
    setActiveDialog('log')
  }

  function handleSpoke(spokeId) {
    if (spokeId === 'water') {
      openLogDialog('watering')
      return
    }
    if (spokeId === 'feed') {
      openLogDialog('feeding')
      return
    }
    if (spokeId === 'photo') {
      openPicker()
      return
    }
    if (spokeId === 'doctor') {
      toast.info('Plant Doctor coming soon')
    }
  }

  const menuActions = [
    { id: 'edit', label: 'Edit plant', icon: faPenToSquare, dialog: 'edit' },
    { id: 'log', label: 'Log care', icon: faSeedling, dialog: 'log' },
    { id: 'doctor', label: 'Plant Doctor', icon: faStethoscope, message: 'Plant Doctor coming soon' },
    { id: 'delete', label: 'Delete plant', icon: faTrashCan, variant: 'danger', dialog: 'delete' },
  ]

  function handleMenuAction(action) {
    if (action.dialog === 'log') {
      openLogDialog('watering')
      return
    }
    if (action.dialog) {
      setActiveDialog(action.dialog)
      return
    }
    toast.info(action.message)
  }

  const ageText = ageLabel(plant)
  const personalityQuote = plant.species?.personality ? getPlantHeroQuote(plant.species.personality, plant.id) : null

  const overflowMenu = (
    <Menu label="Plant actions">
      <Menu.Trigger icon={faEllipsisVertical} />
      <Menu.Items>
        {menuActions.map((action) => (
          <Menu.Item
            key={action.id}
            icon={action.icon}
            variant={action.variant}
            onClick={() => handleMenuAction(action)}
          >
            {action.label}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  )

  const breadcrumbItems = [
    { label: 'House', to: '/house' },
    plant.space?.name && { label: plant.space.name, to: `/house?view=list&space_id=${plant.space.id}` },
    { label: plant.nickname },
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-6 lg:gap-8 px-3 lg:px-6 py-4 lg:py-6 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb items={breadcrumbItems} />
        {overflowMenu}
      </div>

      <header className="flex flex-col items-center lg:flex-row lg:items-center lg:justify-center lg:gap-10 gap-4">
        <div className="shrink-0">
          <RadialWheel
            size={compact ? 'md' : 'lg'}
            showOrbit
            urgent={isUrgent}
            spokes={spokes}
            onSpoke={handleSpoke}
            open
            onOpenChange={() => {}}
            centreLabel={plant.nickname}
            centreSlot={
              <span
                className={`relative ${compact ? 'w-[116px] h-[116px]' : 'w-[170px] h-[170px]'} rounded-full plant-portrait-glass ${
                  isUrgent ? 'plant-portrait-urgent' : ''
                } flex items-center justify-center`}
              >
                <span className="relative z-[2]">
                  <PlantAvatar species={plant.species} size={compact ? '2xl' : '3xl'} shape="circle" />
                </span>
              </span>
            }
          />
        </div>

        <div className="flex flex-col items-center lg:items-start gap-2 text-center lg:text-left max-w-md">
          {personalityQuote && (
            <Quote scheme="coral" size="lg">
              {personalityQuote}
            </Quote>
          )}
          <Heading as="h1" variant="display-lg" className="text-ink">
            {plant.nickname}
          </Heading>
          {plant.species?.scientific_name && (
            <p className="font-display italic text-sm text-ink-soft">{plant.species.scientific_name}</p>
          )}
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {plant.space?.name && (
              <Badge scheme="emerald" size="sm" icon={<FontAwesomeIcon icon={faLocationDot} className="w-2.5 h-2.5" />}>
                {plant.space.name}
              </Badge>
            )}
            {ageText && (
              <Badge scheme="sunshine" size="sm" icon={<FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />}>
                {ageText}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <CareRingsRow plant={plant} />

      <div className="self-start">
        <SegmentedControl
          label="Plant view"
          labelHidden
          value={view}
          onChange={handleViewChange}
          options={[
            { value: 'care', label: 'Care', icon: '💧' },
            { value: 'species', label: 'Species', icon: '🌿', loading: speciesFetching },
            { value: 'journal', label: 'Journal', icon: '📖' },
          ]}
        />
      </div>

      {view === 'care' && <CareView plant={plant} />}
      {view === 'species' && <SpeciesView species={species} />}
      {view === 'journal' && (
        <div className="flex flex-col h-[80dvh] shrink-0">
          <Journal plantId={plant.id} fill />
        </div>
      )}

      <EditPlantDialog
        plant={plant}
        open={activeDialog === 'edit'}
        onClose={() => setActiveDialog(null)}
        onDeleteRequest={() => setActiveDialog('delete')}
      />
      <LogCareDialog
        plant={plant}
        open={activeDialog === 'log'}
        onClose={() => setActiveDialog(null)}
        defaultCareType={logDefaultCareType}
      />
      <DeletePlantDialog plant={plant} open={activeDialog === 'delete'} onClose={() => setActiveDialog(null)} />
    </div>
  )
}
