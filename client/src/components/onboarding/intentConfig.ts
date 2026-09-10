import type { OnboardingIntent } from '../../types/user'
import { INTENTS, INTENT_KEYS as RAW_INTENT_KEYS } from '../../utils/intents'

export const TOTAL_STEPS = 8
export const FIRST_STEP = 0
export const LAST_STEP = TOTAL_STEPS - 1

export const SLUG_BY_STEP = ['', 'intent', 'spaces', 'species', 'environment', 'stakes', 'journal', 'done']

export const STEP_NAMES = ['Welcome', 'Intent', 'Spaces', 'Plants', 'Environment', 'Stakes', 'Journal', 'All set']
export const STEP_BY_SLUG: Record<string, number> = SLUG_BY_STEP.reduce<Record<string, number>>(
  (accumulator, slug, index) => {
    accumulator[slug] = index
    return accumulator
  },
  {},
)

export function stepFromSlug(slug?: string): number {
  if (slug === undefined) return 0
  return STEP_BY_SLUG[slug] ?? 0
}

export function pathForStep(step: number): string {
  const slug = SLUG_BY_STEP[step]
  return slug ? `/welcome/${slug}` : '/welcome'
}

type WizardBehaviour = {
  previewLine: string
  previewIcon: string
  skipSteps: number[]
  completionRoute: string
  completionCta: string
}

// What the wizard does with each intent, composed onto the shared
// identity in utils/intents.ts so the Me page can name the same four
// intents without inheriting step indices it has no use for.
const WIZARD_BEHAVIOUR: Record<OnboardingIntent, WizardBehaviour> = {
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

type IntentInfo = (typeof INTENTS)[OnboardingIntent]
export type IntentConfig = IntentInfo & WizardBehaviour

// Object.keys() (utils/intents.ts's INTENT_KEYS) is typed string[]
// regardless of the source object's key type — INTENTS' keys are the
// closed OnboardingIntent enum, so this is a safe narrowing, not a real
// widening of what the list can contain. Same pattern as me/IntentCard.tsx.
// Re-exported under the original name so consumers (Step1Intent) get the
// narrowed type rather than utils/intents.ts's raw string[].
const INTENT_KEYS = RAW_INTENT_KEYS as OnboardingIntent[]

export const INTENT_CONFIG = Object.fromEntries(
  INTENT_KEYS.map((intent) => [intent, { ...INTENTS[intent], ...WIZARD_BEHAVIOUR[intent] }]),
) as Record<OnboardingIntent, IntentConfig>

export { INTENT_KEYS }

export function getIntentConfig(intent?: OnboardingIntent | null): IntentConfig | null {
  if (!intent) return null
  return INTENT_CONFIG[intent] ?? null
}

export function intentSkipsStep(intent: OnboardingIntent | null | undefined, stepIndex: number): boolean {
  const config = getIntentConfig(intent)
  if (!config) return false
  return config.skipSteps.includes(stepIndex)
}

export function nextVisibleStep(currentStep: number, intent: OnboardingIntent | null | undefined): number {
  let candidate = currentStep + 1
  while (candidate <= LAST_STEP && intentSkipsStep(intent, candidate)) {
    candidate += 1
  }
  return Math.min(candidate, LAST_STEP)
}

export function previousVisibleStep(currentStep: number, intent: OnboardingIntent | null | undefined): number {
  let candidate = currentStep - 1
  while (candidate >= FIRST_STEP && intentSkipsStep(intent, candidate)) {
    candidate -= 1
  }
  return Math.max(candidate, FIRST_STEP)
}
