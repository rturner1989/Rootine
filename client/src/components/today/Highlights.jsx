import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import PlantQuickDialog from '../plants/QuickDialog'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Heading from '../ui/Heading'
import IconDisc from '../ui/IconDisc'

const HEADER_ICON = (
  <span
    aria-hidden="true"
    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] bg-mint text-emerald"
  >
    💡
  </span>
)

// Contextual signals the rituals card doesn't surface. Tiles derive
// from dashboard state — sick plant nudge, streak-at-risk, fallback
// discover prompt. Hidden entirely when no tile fires. Same visual
// chrome as the original "What can I help with?" mockup.
export default function Highlights({ data }) {
  const tiles = buildTiles(data)
  const [activePlant, setActivePlant] = useState(null)

  if (tiles.length === 0) return null

  return (
    <>
      <Card variant="paper-warm" className="p-4 gap-3">
        <Card.Header divider={false} className="flex items-center justify-between gap-3 flex-wrap">
          <Heading as="h2" variant="panel" className="text-ink flex items-center gap-2">
            {HEADER_ICON}
            Heads up
          </Heading>
          <Card.Meta count={tiles.length}>
            {tiles.length === 1 ? 'thing worth knowing' : 'things worth knowing'}
          </Card.Meta>
        </Card.Header>
        <Card.Body className="!overflow-visible !flex-none">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {tiles.map((tile) => (
              <li key={tile.id}>
                <HighlightTile tile={tile} onPlantTileClick={setActivePlant} />
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>

      <PlantQuickDialog plant={activePlant} open={Boolean(activePlant)} onClose={() => setActivePlant(null)} />
    </>
  )
}

const VARIANT_CLASSES = {
  urgent: {
    icon: 'bg-coral/15 text-coral-deep shadow-[inset_0_0_0_1px_rgba(255,107,61,0.4)]',
    title: 'text-coral-deep',
    sub: 'font-display italic text-coral-deep font-medium',
  },
  warn: {
    icon: 'bg-sunshine/20 text-sunshine-deep shadow-[inset_0_0_0_1px_rgba(245,158,11,0.3)]',
    title: 'text-ink',
    sub: 'text-ink-soft',
  },
  info: {
    icon: 'plant-portrait text-ink',
    title: 'text-ink',
    sub: 'text-ink-soft',
  },
}

function HighlightTile({ tile, onPlantTileClick }) {
  const variant = VARIANT_CLASSES[tile.variant] ?? VARIANT_CLASSES.info
  const handlePlantTile = tile.plant ? () => onPlantTileClick(tile.plant) : null

  return (
    <Action
      variant="unstyled"
      to={handlePlantTile ? undefined : tile.to}
      onClick={handlePlantTile ?? tile.onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-md bg-paper shadow-warm-sm hover:shadow-warm-md hover:-translate-y-px transition-all text-left"
    >
      <IconDisc tint={variant.icon}>{tile.icon}</IconDisc>
      <span className="flex-1 min-w-0">
        <span className={`block text-[13px] font-bold tracking-tight ${variant.title}`}>{tile.title}</span>
        <span className={`block text-[11px] mt-0.5 ${variant.sub}`}>{tile.sub}</span>
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 w-[22px] h-[22px] rounded-full bg-paper-deep text-ink-soft flex items-center justify-center text-[10px]"
      >
        <FontAwesomeIcon icon={faArrowRight} />
      </span>
    </Action>
  )
}

const SICK_TILE_CAP = 3

function buildTiles(data) {
  if (!data) return []

  const tiles = []
  const sickPlants = findSickPlants(data)
  const streakAtRisk = computeStreakAtRisk(data)

  for (const plant of sickPlants.slice(0, SICK_TILE_CAP)) {
    tiles.push({
      id: `sick-${plant.id}`,
      icon: '🩺',
      title: `Check on ${plant.nickname}`,
      sub: 'Looks like attention is needed',
      variant: 'urgent',
      plant,
    })
  }

  if (streakAtRisk) {
    tiles.push({
      id: 'streak',
      icon: '🔥',
      title: "Don't break your streak",
      sub: streakAtRisk.sub,
      variant: 'warn',
      onClick: () => document.getElementById('todays-rituals')?.scrollIntoView({ behavior: 'smooth' }),
    })
  }

  if (tiles.length === 0) {
    tiles.push({
      id: 'discover',
      icon: '✨',
      title: 'Find your next plant',
      sub: 'Browse species suited to your spaces',
      variant: 'info',
      to: '/encyclopedia',
    })
  }

  return tiles
}

// Dedupe across plants_needing_water + plants_needing_feeding (a plant
// can be in both) so we don't surface the same nickname twice.
function findSickPlants(data) {
  const candidates = [...(data.plants_needing_water ?? []), ...(data.plants_needing_feeding ?? [])]
  const overdue = candidates.filter((plant) => plant.water_status === 'overdue' || plant.feed_status === 'overdue')
  const seen = new Map()
  for (const plant of overdue) {
    if (!seen.has(plant.id)) seen.set(plant.id, plant)
  }
  return Array.from(seen.values())
}

function computeStreakAtRisk(data) {
  const careStreak = data?.streak?.care_current ?? 0
  const tasksRemaining = data?.tasks?.length ?? 0
  if (careStreak < 3 || tasksRemaining === 0) return null

  return {
    sub: `${tasksRemaining} ${tasksRemaining === 1 ? 'ritual' : 'rituals'} left today · ${careStreak}-day streak alive`,
  }
}
