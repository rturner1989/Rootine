import { useMemo, useState } from 'react'
import { useAddPlant } from '../../hooks/useAddPlant'
import { useSearchState } from '../../hooks/useSearch'
import { formatSpaceName } from '../../utils/spaceIcons'
import { spaceMatchesQuery } from '../../utils/spaceSearch'
import Row from '../plants/Row'
import Action from '../ui/Action'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import Accordion from './list/Accordion'
import AddSpaceRow from './list/AddSpaceRow'

export default function ListView({
  spaces,
  plants,
  weatherToday,
  filteredSpaceId,
  onAddSpace,
  onEditSpace,
  onDeleteSpace,
}) {
  const { open: openAddPlant } = useAddPlant()
  const [openSpaceId, setOpenSpaceId] = useState(() => {
    const firstNonEmpty = spaces.find((space) => plants.some((plant) => plant.space?.id === space.id))
    return firstNonEmpty?.id ?? spaces[0]?.id ?? null
  })

  const { query, isMobileDrawerOpen } = useSearchState()
  // Don't filter the underlying list while the mobile drawer is open —
  // the drawer's results pane is what the user is reading. The query
  // clears on drawer close, which then settles the list back to its
  // unfiltered state.
  const effectiveQuery = isMobileDrawerOpen ? '' : query
  const trimmedQuery = effectiveQuery.trim().toLowerCase()
  const hasActiveFilter = Boolean(filteredSpaceId) || trimmedQuery.length > 0

  const groups = useMemo(() => {
    const visibleSpaces = filteredSpaceId
      ? spaces.filter((space) => space.id === filteredSpaceId)
      : trimmedQuery
        ? spaces.filter((space) => spaceMatchesQuery(space, plants, trimmedQuery))
        : spaces
    return visibleSpaces.map((space) => ({
      space,
      plants: plants.filter((plant) => plant.space?.id === space.id),
    }))
  }, [spaces, plants, filteredSpaceId, trimmedQuery])

  function toggleSpace(spaceId) {
    setOpenSpaceId((current) => (current === spaceId ? null : spaceId))
  }

  return (
    <Card variant="paper-warm" className="overflow-hidden">
      <Card.Header
        divider={false}
        className="grid grid-cols-[40px_1fr_140px_24px] sm:grid-cols-[40px_1fr_160px_24px] items-center gap-3.5 px-4 sm:px-[18px] py-2.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-ink-softer border-b border-paper-edge"
      >
        <span aria-hidden="true" />
        <span>Plant</span>
        <span>Next care</span>
        <span className="text-right">Mood</span>
      </Card.Header>
      <Card.Body className="!overflow-visible !flex-none">
        <AddSpaceRow onClick={onAddSpace} />
        {hasActiveFilter && groups.length === 0 ? (
          <p className="px-[18px] py-10 text-center text-sm text-ink-soft">
            No spaces match {effectiveQuery ? `“${effectiveQuery}”` : 'these filters'}.
          </p>
        ) : (
          groups.map(({ space, plants: spacePlants }) => {
            const isOpen = hasActiveFilter || openSpaceId === space.id
            return (
              <Accordion
                key={space.id}
                space={space}
                weatherToday={weatherToday}
                isOpen={isOpen}
                onToggle={() => toggleSpace(space.id)}
                onAddPlant={() => openAddPlant({ defaultSpaceId: space.id })}
                onEdit={onEditSpace}
                onDelete={onDeleteSpace}
              >
                {spacePlants.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    tone="mint"
                    icon={<span>🌱</span>}
                    description={`No plants in ${formatSpaceName(space.name)} yet.`}
                    actions={
                      <Action onClick={() => openAddPlant({ defaultSpaceId: space.id })} variant="secondary">
                        Add one
                      </Action>
                    }
                    className="py-6"
                  />
                ) : (
                  spacePlants.map((plant) => <Row key={plant.id} plant={plant} />)
                )}
              </Accordion>
            )
          })
        )}
      </Card.Body>
    </Card>
  )
}
