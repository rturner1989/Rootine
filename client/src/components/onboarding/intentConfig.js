import { INTENT_KEYS, INTENTS } from '../../utils/intents'

export const TOTAL_STEPS = 8
export const FIRST_STEP = 0
export const LAST_STEP = TOTAL_STEPS - 1

export const SLUG_BY_STEP = ['', 'intent', 'spaces', 'species', 'environment', 'stakes', 'journal', 'done']

export const STEP_NAMES = ['Welcome', 'Intent', 'Spaces', 'Plants', 'Environment', 'Stakes', 'Journal', 'All set']
export const STEP_BY_SLUG = SLUG_BY_STEP.reduce((accumulator, slug, index) => {
  accumulator[slug] = index
  return accumulator
}, {})

export function stepFromSlug(slug) {
  if (slug === undefined) return 0
  return STEP_BY_SLUG[slug] ?? 0
}

export function pathForStep(step) {
  const slug = SLUG_BY_STEP[step]
  return slug ? `/welcome/${slug}` : '/welcome'
}

// What the wizard does with each intent, composed onto the shared
// identity in utils/intents.js so the Me page can name the same four
// intents without inheriting step indices it has no use for.
const WIZARD_BEHAVIOUR = {
  forgetful: {
    previewLine: "You'll see streaks + gentle daily rituals the moment you land.",
    previewIcon: '🔔',
    skipSteps: [],
    completionRoute: '/',
    completionCta: 'Enter your greenhouse',
  },
  just_starting: {
    previewLine: "We'll explain each step + start you with easy-care species.",
    previewIcon: '🌱',
    skipSteps: [],
    completionRoute: '/',
    completionCta: 'Enter your greenhouse · take your time',
  },
  sick_plant: {
    previewLine: "We'll skip the tour and head straight to diagnosing.",
    previewIcon: '🩺',
    skipSteps: [4, 5],
    completionRoute: '/doctor',
    completionCta: "Let's check on that plant",
  },
  browsing: {
    previewLine: "We'll surface the library so you can browse before committing.",
    previewIcon: '📚',
    skipSteps: [5],
    completionRoute: '/encyclopedia',
    completionCta: 'Explore the library',
  },
}

export const INTENT_CONFIG = Object.fromEntries(
  INTENT_KEYS.map((intent) => [intent, { ...INTENTS[intent], ...WIZARD_BEHAVIOUR[intent] }]),
)

export { INTENT_KEYS }

export function getIntentConfig(intent) {
  if (!intent) return null
  return INTENT_CONFIG[intent] ?? null
}

export function intentSkipsStep(intent, stepIndex) {
  const config = getIntentConfig(intent)
  if (!config) return false
  return config.skipSteps.includes(stepIndex)
}

export function nextVisibleStep(currentStep, intent) {
  let candidate = currentStep + 1
  while (candidate <= LAST_STEP && intentSkipsStep(intent, candidate)) {
    candidate += 1
  }
  return Math.min(candidate, LAST_STEP)
}

export function previousVisibleStep(currentStep, intent) {
  let candidate = currentStep - 1
  while (candidate >= FIRST_STEP && intentSkipsStep(intent, candidate)) {
    candidate -= 1
  }
  return Math.max(candidate, FIRST_STEP)
}
