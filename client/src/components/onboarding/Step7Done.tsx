import type { FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { Plant } from '../../types/plant'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'
import { getIntentConfig } from './intentConfig'

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

const SPARKLES = [
  { id: 'tl', glyph: '✦', position: { top: '8%', left: '10%' } },
  { id: 'tr', glyph: '✧', position: { top: '16%', right: '8%' } },
  { id: 'l', glyph: '·', position: { top: '28%', left: '6%' } },
  { id: 'br', glyph: '✦', position: { bottom: '28%', right: '12%' } },
  { id: 'bl', glyph: '✧', position: { bottom: '20%', left: '12%' } },
]

type Step7DoneProps = {
  createdPlants?: Plant[]
  onFinish: () => void
  finishing?: boolean
}

function residentsLine(count: number) {
  if (count === 0) return 'Your greenhouse is ready when you are.'

  const word = count < NUMBER_WORDS.length ? NUMBER_WORDS[count] : String(count)
  const noun = count === 1 ? 'resident' : 'residents'
  return `Your greenhouse has ${word} ${noun}, ready to be known.`
}

export default function Step7Done({ createdPlants = [], onFinish, finishing = false }: Step7DoneProps) {
  const { user } = useAuth()
  const intent = user?.onboarding_intent ?? null
  const intentConfig = getIntentConfig(intent)
  const completionCta = intentConfig?.completionCta ?? 'Enter your greenhouse'
  const firstName = user?.name?.split(' ')[0]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onFinish()
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
      <Card.Body className="relative flex flex-col items-center justify-center text-center gap-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {SPARKLES.map((sparkle) => (
            <span key={sparkle.id} className="absolute text-sunshine-deep text-2xl opacity-60" style={sparkle.position}>
              {sparkle.glyph}
            </span>
          ))}
        </div>
        <span className="text-7xl" aria-hidden="true">
          🌿
        </span>
        <Heading variant="display" className="text-ink" subtitle={residentsLine(createdPlants.length)}>
          You're <Emphasis>all set</Emphasis>
          {firstName ? `, ${firstName}` : ''}.
        </Heading>
      </Card.Body>

      <Card.Footer divider={false} className="pt-2">
        <Action type="submit" variant="primary" disabled={finishing} className="w-full justify-center">
          {finishing ? 'Finishing up…' : `${completionCta} →`}
        </Action>
      </Card.Footer>
    </form>
  )
}
