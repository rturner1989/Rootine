import { faDroplet, faSun, faTemperatureHalf } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { usePlants } from '../../hooks/usePlants'
import { useSpaces, useUpdateSpace } from '../../hooks/useSpaces'
import { getSpaceEmoji } from '../../utils/spaceIcons'
import SegmentedControl from '../form/SegmentedControl'
import Card from '../ui/Card'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'
import StepTip from '../wizard/StepTip'
import WizardActions from '../wizard/WizardActions'

const FIELDS = [
  { key: 'light_level', label: 'Light', icon: faSun, options: ['low', 'medium', 'bright'] },
  { key: 'temperature_level', label: 'Temperature', icon: faTemperatureHalf, options: ['cool', 'average', 'warm'] },
  { key: 'humidity_level', label: 'Humidity', icon: faDroplet, options: ['dry', 'average', 'humid'] },
]

export default function Step4Environment({ onBack, onContinue }) {
  const { data: spaces = [] } = useSpaces({ scope: 'active' })
  const { data: plants = [] } = usePlants()
  const updateSpace = useUpdateSpace()

  // Per-space env state — seeded from each space's current values so the
  // user sees the suggested defaults pre-filled.
  const [envBySpace, setEnvBySpace] = useState(() =>
    Object.fromEntries(
      spaces.map((space) => [
        space.id,
        {
          light_level: space.light_level,
          temperature_level: space.temperature_level,
          humidity_level: space.humidity_level,
        },
      ]),
    ),
  )

  function setField(spaceId, key, value) {
    setEnvBySpace((prev) => ({
      ...prev,
      [spaceId]: { ...prev[spaceId], [key]: value },
    }))
  }

  function plantSummary(spaceId) {
    const inSpace = plants.filter((plant) => plant.space?.id === spaceId)
    if (inSpace.length === 0) return 'No plants yet'
    const names = inSpace
      .slice(0, 3)
      .map((plant) => plant.nickname)
      .join(', ')
    const more = inSpace.length > 3 ? ` · +${inSpace.length - 3} more` : ''
    return `${inSpace.length} ${inSpace.length === 1 ? 'plant' : 'plants'} · ${names}${more}`
  }

  const { submitting, handleSubmit } = useFormSubmit({
    action: async () => {
      await Promise.all(
        spaces.map((space) => {
          // envBySpace is seeded from useState's lazy initializer, which
          // runs once with whatever `spaces` is at first render. If the
          // spaces query was still loading then, the seed is empty and
          // unchanged segments stay undefined. Fall back to the space's
          // current values so PATCH always sends the right body.
          const env = envBySpace[space.id] ?? {
            light_level: space.light_level,
            temperature_level: space.temperature_level,
            humidity_level: space.humidity_level,
          }
          return updateSpace.mutateAsync({ id: space.id, ...env })
        }),
      )
      onContinue()
    },
    errorMessage: "Couldn't save environment",
  })

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
      <Card.Header divider={false}>
        <Heading
          variant="display"
          className="text-ink"
          subtitle="A rough read is plenty — we'll fine-tune the schedule as you care."
        >
          How do your spaces <Emphasis>feel?</Emphasis>
        </Heading>
        <div className="mt-4">
          <StepTip icon="🌿">Rough is fine. We'll refine the schedule as you care.</StepTip>
        </div>
      </Card.Header>

      <Card.Body className="flex flex-col gap-4">
        {spaces.map((space) => {
          const env = envBySpace[space.id] ?? {
            light_level: space.light_level,
            temperature_level: space.temperature_level,
            humidity_level: space.humidity_level,
          }

          return (
            <section
              key={space.id}
              aria-labelledby={`space-env-${space.id}`}
              className="p-4 bg-mint/40 border-[1.5px] border-dashed border-leaf/25 rounded-md"
            >
              <header className="flex items-center gap-3 mb-3">
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {getSpaceEmoji(space.icon)}
                </span>
                <div className="min-w-0 text-left">
                  <Heading as="h3" variant="compact" id={`space-env-${space.id}`} className="truncate">
                    {space.name}
                  </Heading>
                  <p className="text-xs text-ink-soft truncate">{plantSummary(space.id)}</p>
                </div>
              </header>

              <div className="flex flex-col gap-5">
                {FIELDS.map(({ key, label, icon, options }) => (
                  <SegmentedControl
                    key={key}
                    label={label}
                    icon={icon}
                    value={env[key]}
                    onChange={(next) => setField(space.id, key, next)}
                    options={options}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </Card.Body>

      <WizardActions onBack={onBack} submitting={submitting} submittingLabel="Saving env…" />
    </form>
  )
}
