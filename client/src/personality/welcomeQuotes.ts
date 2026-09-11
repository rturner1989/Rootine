import type { Personality } from '../types/species'

const PERSONALITY_QUOTES: Record<Personality, string[]> = {
  dramatic: [
    'My debut. Try not to upstage me.',
    'I have arrived. Attend to me accordingly.',
    'Set the lighting. Summon the sun.',
    'Every great collection begins with a star.',
  ],
  prickly: [
    "Fine. I'm here. Don't make a fuss.",
    "Don't expect small talk.",
    "I'll be over there. Staying out of the way.",
    "Water me. Or don't. See if I care.",
  ],
  chill: [
    'Found my spot. No notes.',
    'Happy to be here. Take your time.',
    "All good. We're vibing.",
    'Space feels right.',
  ],
  needy: [
    'Are we best friends yet?',
    "Did you miss me yet? It's been seconds.",
    "Best decision you've made all week.",
    "Please don't leave me.",
  ],
  stoic: ['Arrived. Stationed. Operational.', 'Position acquired. Standing by.', 'Ready to grow.', 'Status: nominal.'],
}

const GENERIC_QUOTES = [
  'Welcome to your jungle.',
  'Your rituals begin here.',
  'One plant at a time.',
  'The jungle grows from here.',
]

function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getWelcomeQuote(personality?: Personality): string {
  const pool = (personality ? PERSONALITY_QUOTES[personality] : undefined) ?? GENERIC_QUOTES
  return pickRandom(pool)
}
