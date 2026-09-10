import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import { useAddPlant } from '../../hooks/useAddPlant'
import type { Plant } from '../../types/plant'
import PlantAvatar from '../plants/Avatar'
import QuickDialog from '../plants/QuickDialog'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Heading from '../ui/Heading'

type PlantMood = 'thriving' | 'thirsty' | 'wilting'

function plantStatus(plant: Plant): PlantMood {
  const states = [plant.water_status, plant.feed_status]
  if (states.includes('overdue')) return 'wilting'
  if (states.includes('due_today') || states.includes('due_soon')) return 'thirsty'
  return 'thriving'
}

const MOOD_ICON: Record<PlantMood, { glyph: string; className: string }> = {
  thriving: { glyph: '✓', className: 'text-leaf' },
  thirsty: { glyph: '💧', className: 'text-sunshine-deep' },
  wilting: { glyph: '!', className: 'text-coral shadow-[0_0_0_2px_rgba(255,107,61,0.22)]' },
}

const MOOD_LABEL: Record<PlantMood, string> = {
  thriving: 'thriving',
  thirsty: 'needs water',
  wilting: 'wilting',
}

const HEADER_ICON = (
  <span
    aria-hidden="true"
    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] bg-mint text-emerald"
  >
    🪴
  </span>
)

export type PlantsRowProps = {
  plants?: Plant[]
  spacesCount?: number
}

export default function PlantsRow({ plants = [], spacesCount = 0 }: PlantsRowProps) {
  if (plants.length === 0) return null

  const plantWord = plants.length === 1 ? 'plant' : 'plants'
  const spaceLabel = spacesCount > 0 ? ` · ${spacesCount} ${spacesCount === 1 ? 'space' : 'spaces'}` : ''

  return (
    <Card variant="paper-warm" className="px-4 pt-4 gap-2">
      <Card.Header divider={false} className="flex items-center justify-between">
        <Heading as="h2" variant="panel" className="text-ink flex items-center gap-2">
          {HEADER_ICON}
          What you've got
        </Heading>
        <Action
          to="/house"
          variant="unstyled"
          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-emerald"
        >
          See all →
        </Action>
      </Card.Header>
      <Card.Body className="!overflow-visible !flex-none flex flex-col gap-3">
        <Card.Meta count={plants.length} className="block">
          {plantWord}
          {spaceLabel}
        </Card.Meta>
        <div className="-mx-4 px-4 pb-4 overflow-x-auto">
          <ul className="flex gap-3">
            <li className="shrink-0">
              <AddPlantTile />
            </li>
            {plants.map((plant) => (
              <li key={plant.id} className="shrink-0">
                <PlantTile plant={plant} />
              </li>
            ))}
          </ul>
        </div>
      </Card.Body>
    </Card>
  )
}

function PlantTile({ plant }: { plant: Plant }) {
  const mood = plantStatus(plant)
  const moodIcon = MOOD_ICON[mood]
  const isUrgent = mood === 'wilting'
  const [dialogOpen, setDialogOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const prevMoodRef = useRef(mood)

  // Trigger the celebrate pulse when the plant transitions out of a
  // needs-care state (wilting/thirsty → thriving). Plants that were
  // already thriving don't pulse on every refetch.
  useEffect(() => {
    const prev = prevMoodRef.current
    prevMoodRef.current = mood
    if (mood === 'thriving' && (prev === 'wilting' || prev === 'thirsty')) {
      setCelebrate(true)
      const timer = setTimeout(() => setCelebrate(false), 720)
      return () => clearTimeout(timer)
    }
  }, [mood])

  return (
    <>
      <Action
        variant="unstyled"
        onClick={() => setDialogOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        className="relative block w-40 px-3 pt-4 pb-3 rounded-md bg-paper shadow-warm-sm text-center"
        aria-label={`${plant.nickname} — ${MOOD_LABEL[mood]}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-paper flex items-center justify-center text-[10px] font-bold shadow-[0_2px_6px_rgba(80,56,18,0.12),0_0_0_1px_rgba(80,56,18,0.04)] ${moodIcon.className}`}
        >
          {moodIcon.glyph}
        </span>
        <span
          className={`relative mx-auto mb-2.5 w-[100px] h-[100px] rounded-full plant-portrait ${isUrgent ? 'plant-portrait-urgent' : ''} ${celebrate ? 'plant-portrait-celebrate' : ''} flex items-center justify-center`}
        >
          <span className="relative z-[2]">
            <PlantAvatar species={plant.species} size="2xl" shape="circle" />
          </span>
        </span>
        <span className="block text-[13px] font-bold tracking-tight text-ink truncate">{plant.nickname}</span>
        {plant.species?.common_name ? (
          <span className="block font-display italic text-[11px] text-ink-soft truncate">
            {plant.species.common_name}
          </span>
        ) : null}
      </Action>

      <QuickDialog plant={plant} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}

function AddPlantTile() {
  const { open } = useAddPlant()
  return (
    <Action
      variant="unstyled"
      onClick={() => open()}
      aria-label="Add plant"
      className="flex flex-col items-center justify-center gap-1.5 w-40 h-full px-3 py-4 rounded-md border-2 border-dashed border-emerald/30 bg-paper hover:border-leaf hover:bg-lime/10 transition-colors text-center"
    >
      <span
        aria-hidden="true"
        className="w-11 h-11 rounded-full bg-mint text-emerald flex items-center justify-center mb-1"
      >
        <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
      </span>
      <span className="font-display italic text-[17px] text-emerald leading-none">Add a plant</span>
      <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-softer">New roommate</span>
    </Action>
  )
}
