import type { SpeciesIndexResult } from '../../types/species'
import Card from '../ui/Card'
import SpeciesPicker from './SpeciesPicker'

export type StepSpeciesProps = {
  onPick: (species: SpeciesIndexResult) => void
}

export default function StepSpecies({ onPick }: StepSpeciesProps) {
  return (
    <Card.Body className="flex flex-col gap-4">
      <SpeciesPicker onPick={onPick} actionLabel="pick" autoFocus />
    </Card.Body>
  )
}
