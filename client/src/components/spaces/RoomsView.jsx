import { faPenToSquare, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useMemo } from 'react'
import { useAddPlant } from '../../hooks/useAddPlant'
import { useSearchState } from '../../hooks/useSearch'
import { capitalise } from '../../utils/capitalise'
import { pluralize } from '../../utils/pluralize'
import { formatSpaceName, getSpaceEmoji } from '../../utils/spaceIcons'
import { spaceMatchesQuery } from '../../utils/spaceSearch'
import Action from '../ui/Action'
import EmptyState from '../ui/EmptyState'
import Menu from '../ui/Menu'
import AddSpaceTile from './rooms/AddSpaceTile'
import RoomCard from './rooms/RoomCard'

function needsCare(plant) {
  return plant.water_status === 'overdue' || plant.feed_status === 'overdue'
}

function envHintFor(space) {
  if (!space.light_level || !space.humidity_level) return null
  const light = capitalise(space.light_level)
  return `${light} · ${space.humidity_level} humidity`
}

function nextCareFor(plants) {
  let best = null
  for (const plant of plants) {
    if (plant.days_until_water != null && (best === null || plant.days_until_water < best.days)) {
      best = { kind: 'water', icon: '💧', plant, days: plant.days_until_water }
    }
    if (plant.days_until_feed != null && (best === null || plant.days_until_feed < best.days)) {
      best = { kind: 'feed', icon: '🌱', plant, days: plant.days_until_feed }
    }
  }
  if (!best) return null

  const { days, plant, icon } = best
  let label
  if (days < 0) {
    const overdue = Math.abs(days)
    label = `${plant.nickname} · ${pluralize(overdue, 'day')} overdue`
  } else if (days === 0) {
    label = `${plant.nickname} · due today`
  } else {
    label = `${plant.nickname} · in ${days}d`
  }
  return { icon, label, overdue: days < 0 }
}

function peekFor(plants) {
  return [...plants]
    .sort((a, b) => (needsCare(a) ? 0 : 1) - (needsCare(b) ? 0 : 1))
    .map((plant) => ({
      id: plant.id,
      nickname: plant.nickname,
      species: plant.species,
      urgent: needsCare(plant),
    }))
}

function weatherPillFor(today) {
  if (!today) return null

  return {
    icon: today.icon ?? '☀',
    label: today.detail ?? today.label,
    scheme: today.scheme,
  }
}

export default function RoomsView({ spaces, plants, weatherToday, onAddSpace, onEditSpace, onDeleteSpace }) {
  const { open: openAddPlant } = useAddPlant()
  const { query, isMobileDrawerOpen } = useSearchState()
  const trimmedQuery = isMobileDrawerOpen ? '' : query.trim().toLowerCase()

  const cards = useMemo(() => {
    if (!spaces || !plants) return []

    const visibleSpaces = trimmedQuery
      ? spaces.filter((space) => spaceMatchesQuery(space, plants, trimmedQuery))
      : spaces
    return visibleSpaces.map((space) => {
      const spacePlants = plants.filter((plant) => plant.space?.id === space.id)
      return {
        space,
        peek: peekFor(spacePlants),
        nextCare: nextCareFor(spacePlants),
      }
    })
  }, [spaces, plants, trimmedQuery])

  if (spaces.length === 0) {
    return (
      <EmptyState
        tone="sunshine"
        icon={<span>🏠</span>}
        title={
          <>
            No spaces, no plants — <em>yet</em>
          </>
        }
        description="Spaces keep your plants grouped by where they live. Add one to get started."
        actions={
          <Action onClick={onAddSpace} variant="primary">
            Add a space
          </Action>
        }
      />
    )
  }

  return (
    <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 list-none p-0">
      <li>
        <AddSpaceTile onClick={onAddSpace} />
      </li>
      {cards.map(({ space, peek, nextCare }) => {
        const isOutdoor = space.category === 'outdoor'
        const displayName = formatSpaceName(space.name)
        return (
          <li key={space.id} className="relative">
            <RoomCard
              spaceId={space.id}
              icon={getSpaceEmoji(space.icon)}
              name={displayName}
              count={`${pluralize(space.plants_count, 'plant')} · ${space.category}`}
              variant={isOutdoor ? 'outdoor' : 'indoor'}
              peek={peek}
              nextCare={nextCare}
              envHint={envHintFor(space)}
              weatherPill={isOutdoor ? weatherPillFor(weatherToday) : null}
            />
            <div className="absolute top-3 right-3">
              <Menu label={`${displayName} actions`}>
                <Menu.Trigger />
                <Menu.Items>
                  <Menu.Item icon={faPlus} onClick={() => openAddPlant({ defaultSpaceId: space.id })}>
                    Add a plant
                  </Menu.Item>
                  <Menu.Item icon={faPenToSquare} onClick={() => onEditSpace(space)}>
                    Edit space
                  </Menu.Item>
                  {onDeleteSpace && (
                    <>
                      <Menu.Divider />
                      <Menu.Item icon={faTrash} variant="danger" onClick={() => onDeleteSpace(space)}>
                        Delete space
                      </Menu.Item>
                    </>
                  )}
                </Menu.Items>
              </Menu>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
