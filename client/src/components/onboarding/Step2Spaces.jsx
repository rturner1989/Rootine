import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { ValidationError } from '../../errors/ValidationError'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import {
  useArchiveSpace,
  useCreateSpace,
  useDeleteSpace,
  useSpacePresets,
  useSpaces,
  useUnarchiveSpace,
} from '../../hooks/useSpaces'
import { getSpaceEmoji } from '../../utils/spaceIcons'
import Tile from '../form/Tile'
import SpaceFormDialog from '../spaces/SpaceFormDialog'
import Card from '../ui/Card'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'
import StepTip from '../wizard/StepTip'
import WizardActions from '../wizard/WizardActions'

const CATEGORY_LABELS = {
  indoor: { emoji: '🏠', label: 'Indoor' },
  outdoor: { emoji: '🌳', label: 'Outdoor' },
}

function CategoryFieldset({ emoji, label, children }) {
  return (
    <fieldset className="border-0 p-0 m-0 text-left">
      <legend className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.14em] uppercase text-ink-soft mb-2.5">
        <span aria-hidden="true">{emoji}</span>
        {label}
      </legend>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{children}</div>
    </fieldset>
  )
}

export default function Step2Spaces({ onBack, onComplete }) {
  const { data: allSpaces = [], isSuccess: spacesLoaded } = useSpaces({ scope: 'all' })
  const [selectedSpaces, setSelectedSpaces] = useState([])
  const [hydrated, setHydrated] = useState(false)
  const [pendingCustom, setPendingCustom] = useState([])
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const toast = useToast()
  const shouldReduceMotion = useReducedMotion()

  const { data: presets = [], error: presetsError, isSuccess: presetsLoaded } = useSpacePresets()
  const createSpace = useCreateSpace()
  const archiveSpace = useArchiveSpace()
  const unarchiveSpace = useUnarchiveSpace()
  const deleteSpace = useDeleteSpace()

  useEffect(() => {
    if (!spacesLoaded || hydrated) return

    setSelectedSpaces(allSpaces.filter((space) => !space.archived_at).map((space) => space.name))
    setHydrated(true)
  }, [spacesLoaded, hydrated, allSpaces])

  useEffect(() => {
    if (presetsError) toast.error(presetsError.message)
  }, [presetsError, toast])

  const presetsByCategory = useMemo(() => {
    const grouped = { indoor: [], outdoor: [] }
    for (const preset of presets) {
      const bucket = grouped[preset.category]
      if (bucket) bucket.push(preset)
    }
    return grouped
  }, [presets])

  const customSpaces = useMemo(() => {
    if (!presetsLoaded) return []

    const presetNames = new Set(presets.map((preset) => preset.name))
    const serverCustomNames = allSpaces.filter((space) => !presetNames.has(space.name)).map((space) => space.name)
    const pendingNames = pendingCustom.map((entry) => entry.name)
    return Array.from(new Set([...serverCustomNames, ...pendingNames]))
  }, [allSpaces, pendingCustom, presets, presetsLoaded])

  const customIconByName = useMemo(() => {
    const map = new Map()
    for (const space of allSpaces) map.set(space.name, space.icon)
    for (const entry of pendingCustom) map.set(entry.name, entry.icon)
    return map
  }, [allSpaces, pendingCustom])

  const selectedSpaceSet = useMemo(() => new Set(selectedSpaces), [selectedSpaces])

  function toggleSpace(spaceName) {
    setSelectedSpaces((prev) =>
      prev.includes(spaceName) ? prev.filter((name) => name !== spaceName) : [...prev, spaceName],
    )
  }

  function handleAddCustom({ name, category, icon }) {
    setSelectedSpaces((prev) => [...prev, name])
    setPendingCustom((prev) => [...prev, { name, category, icon }])
  }

  const pendingCustomNames = useMemo(() => new Set(pendingCustom.map((entry) => entry.name)), [pendingCustom])
  const serverByName = useMemo(() => new Map(allSpaces.map((space) => [space.name, space])), [allSpaces])

  function canRemoveCustom(name) {
    if (pendingCustomNames.has(name)) return true
    const server = serverByName.get(name)
    // Server-side customs are only safely removable when no plants live in
    // them — DELETE cascades and would take user data with it. Spaces that
    // already have plants stay until Step 3 lets the user reassign or
    // remove those plants first.
    return Boolean(server && (server.plants_count ?? 0) === 0)
  }

  function handleRemoveCustom(name) {
    setSelectedSpaces((prev) => prev.filter((entry) => entry !== name))

    if (pendingCustomNames.has(name)) {
      setPendingCustom((prev) => prev.filter((entry) => entry.name !== name))
      return
    }

    const server = serverByName.get(name)
    if (server) {
      deleteSpace.mutate(server.id, {
        onError: (err) => toast.error(err.message ?? "Couldn't remove that space"),
      })
    }
  }

  const { submitting, handleSubmit, formRef } = useFormSubmit({
    action: async () => {
      const serverByName = new Map(allSpaces.map((space) => [space.name, space]))
      const selectedNames = new Set(selectedSpaces)
      const pendingByName = new Map(pendingCustom.map((entry) => [entry.name, entry]))

      try {
        const operations = selectedSpaces.map((spaceName) => {
          const existing = serverByName.get(spaceName)
          if (existing) {
            return existing.archived_at ? unarchiveSpace.mutateAsync(existing.id) : Promise.resolve(existing)
          }
          const preset = presets.find((entry) => entry.name === spaceName)
          const pending = pendingByName.get(spaceName)
          const category = preset?.category ?? pending?.category ?? 'indoor'
          const icon = preset?.icon ?? pending?.icon ?? null
          return createSpace.mutateAsync({
            name: spaceName,
            icon,
            category,
          })
        })

        const toArchive = allSpaces.filter((space) => !space.archived_at && !selectedNames.has(space.name))
        const archives = toArchive.map((space) => archiveSpace.mutateAsync(space.id))

        const [createdOrUnarchived] = await Promise.all([Promise.all(operations), Promise.all(archives)])
        onComplete(createdOrUnarchived.filter(Boolean))
      } catch (err) {
        if (err instanceof ValidationError) throw new Error(err.message)
        throw err
      }
    },
    errorMessage: 'Could not save spaces',
  })

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Header divider={false}>
          <Heading
            variant="display"
            className="text-ink"
            subtitle="Name the spaces they call home. Indoor, outdoor, a bit of both — all fine."
          >
            Where do your plants <Emphasis>live?</Emphasis>
          </Heading>
          <div className="mt-4">
            <StepTip icon="🌿">Plants prefer staying put — moving them stresses them out.</StepTip>
          </div>
        </Card.Header>

        <Card.Body className="flex flex-col">
          <div className="flex flex-col gap-10">
            {['indoor', 'outdoor'].map((category) => {
              const categoryPresets = presetsByCategory[category]
              if (!categoryPresets || categoryPresets.length === 0) return null

              const { emoji, label } = CATEGORY_LABELS[category]
              return (
                <CategoryFieldset key={category} emoji={emoji} label={label}>
                  {categoryPresets.map((preset) => (
                    <Tile
                      key={preset.name}
                      icon={getSpaceEmoji(preset.icon)}
                      selected={selectedSpaces.includes(preset.name)}
                      onClick={() => toggleSpace(preset.name)}
                    >
                      {preset.name}
                    </Tile>
                  ))}
                </CategoryFieldset>
              )
            })}

            {customSpaces.length > 0 && (
              <CategoryFieldset emoji="✨" label="Custom">
                <AnimatePresence initial={false}>
                  {customSpaces.map((space) => (
                    <motion.div
                      key={space}
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.33, 1, 0.68, 1] }}
                    >
                      <Tile
                        icon={getSpaceEmoji(customIconByName.get(space)) ?? '✨'}
                        selected={selectedSpaces.includes(space)}
                        onClick={() => toggleSpace(space)}
                        onRemove={canRemoveCustom(space) ? () => handleRemoveCustom(space) : undefined}
                        removeLabel={`Remove ${space}`}
                      >
                        {space}
                      </Tile>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CategoryFieldset>
            )}

            <Tile dashed onClick={() => setCustomDialogOpen(true)} className="self-center">
              + Name a space of your own
            </Tile>
          </div>
        </Card.Body>

        <WizardActions
          onBack={onBack}
          continueDisabled={selectedSpaces.length === 0}
          submitting={submitting}
          submittingLabel="Creating spaces…"
        />
      </form>

      <SpaceFormDialog
        open={customDialogOpen}
        onClose={() => setCustomDialogOpen(false)}
        onAdd={handleAddCustom}
        existingNames={selectedSpaceSet}
        showEnvironment={false}
      />
    </>
  )
}
