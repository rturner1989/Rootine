import type { Personality } from '../types/species'

const PERSONALITY_QUOTES: Record<Personality, string[]> = {
  dramatic: [
    'WAIT. Are you sure? This is a LOT.',
    'A commitment? From YOU? Confirm it.',
    "I'm ready. Are YOU ready?",
    'History in the making. Proceed.',
  ],
  prickly: [
    'Really? Fine. Tap again.',
    'If you insist. Confirm.',
    "Don't waste my time. Yes or no.",
    'Make up your mind.',
  ],
  chill: ['You sure?', 'No pressure, but yeah?', "Whenever you're ready.", 'Sounds good to me.'],
  needy: ['REALLY?! For ME?!', 'You thought of me! Confirm!', 'Oh please yes please.', 'Best day ever incoming.'],
  stoic: ['Confirm action.', 'Awaiting confirmation.', 'Proceed?', 'Ready when you are.'],
}

const GENERIC_QUOTES = ['Confirm?', 'Proceed with care action?', 'Go ahead?', 'Ready?']

function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getConfirmQuote(personality?: Personality): string {
  const pool = (personality ? PERSONALITY_QUOTES[personality] : undefined) ?? GENERIC_QUOTES
  return pickRandom(pool)
}
