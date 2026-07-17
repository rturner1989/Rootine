// Who the user is here — the identity half of an intent, shared by the
// onboarding picker and the Me page's read-only summary. How the wizard
// *behaves* per intent (which steps it skips, where it lands) lives in
// components/onboarding/intentConfig.js, which composes onto these.
// Keys are the canonical `users.onboarding_intent` enum values.
export const INTENTS = {
  forgetful: {
    label: 'Forgetful',
    emoji: '🌵',
    description: 'Plants, yes. Watering them on time — not so much. Help me remember.',
  },
  just_starting: {
    label: 'Just starting out',
    emoji: '🌱',
    description: 'New to plants. Walk me through it, one at a time.',
  },
  sick_plant: {
    label: "Something's wrong",
    emoji: '🤒',
    description: "One of mine isn't doing well. Help me figure out why.",
  },
  browsing: {
    label: 'Browsing',
    emoji: '📚',
    description: 'Curious, not committing. Let me poke around first.',
  },
}

export const INTENT_KEYS = Object.keys(INTENTS)

// Nil is a real state, not an edge case — the column is nullable and
// accounts predating the intent step never picked one.
export function getIntent(intent) {
  if (!intent) return null

  return INTENTS[intent] ?? null
}
