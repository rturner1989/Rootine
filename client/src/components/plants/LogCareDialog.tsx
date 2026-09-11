import { useEffect, useId, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useLogCare } from '../../hooks/usePlants'
import type { CareType } from '../../types/careLog'
import type { Plant } from '../../types/plant'
import { todayISO } from '../../utils/dateInput'
import DateInput from '../form/DateInput'
import SegmentedControl from '../form/SegmentedControl'
import Textarea from '../form/Textarea'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'

const TITLE = 'Log care'

const CARE_TYPE_OPTIONS = [
  { value: 'watering', label: 'Water', icon: '💧' },
  { value: 'feeding', label: 'Feed', icon: '🌱' },
]

const SUCCESS_COPY: Record<CareType, (nickname: string) => string> = {
  watering: (nickname) => `Watered ${nickname} 💧`,
  feeding: (nickname) => `Fed ${nickname} 🌱`,
}

function buildPerformedAt(pickedDate: string, today: string): string {
  if (pickedDate === today) return new Date().toISOString()
  // Noon on picked date avoids timezone-flip surprises (a midnight
  // timestamp can land on the previous day in UTC).
  return new Date(`${pickedDate}T12:00:00`).toISOString()
}

export type LogCareDialogProps = {
  plant: Plant | null
  open: boolean
  onClose: () => void
  defaultCareType?: CareType
}

export default function LogCareDialog({ plant, open, onClose, defaultCareType = 'watering' }: LogCareDialogProps) {
  const toast = useToast()
  const titleId = useId()
  const logCare = useLogCare(plant?.id)
  const today = todayISO()

  const [careType, setCareType] = useState<CareType>(defaultCareType)
  const [performedOn, setPerformedOn] = useState(today)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setCareType(defaultCareType)
      setPerformedOn(todayISO())
      setNotes('')
    }
  }, [open, defaultCareType])

  const { submitting, handleSubmit, formRef } = useFormSubmit({
    action: async () => {
      // Unreachable in practice — see the `if (!plant)` guard below. It has
      // to be re-checked here because useFormSubmit is called unconditionally
      // (Rules of Hooks), before that guard runs.
      if (!plant) return

      await logCare.mutateAsync({
        care_type: careType,
        performed_at: buildPerformedAt(performedOn, today),
        notes: notes.trim() || null,
      })
      toast.success(SUCCESS_COPY[careType](plant.nickname))
      onClose()
    },
    errorMessage: "Couldn't log that care",
  })

  if (!plant) return null

  return (
    <Dialog open={open} onClose={onClose} title={TITLE} ariaLabelledBy={titleId}>
      <Card.Header divider={false}>
        <p id={titleId} className="text-lg font-extrabold text-ink">
          {TITLE}
        </p>
      </Card.Header>

      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Body className="flex flex-col gap-4">
          <SegmentedControl
            label="Care type"
            value={careType}
            onChange={(value) => setCareType(value as CareType)}
            options={CARE_TYPE_OPTIONS}
          />

          <DateInput
            label="When"
            value={performedOn}
            onChange={(event) => setPerformedOn(event.target.value)}
            max={today}
            required
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="How was it? Any observations…"
            rows={3}
          />
        </Card.Body>

        <Card.Footer divider={false} className="flex gap-2.5">
          <Action type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Action>
          <Action type="submit" variant="primary" disabled={submitting} className="ml-auto">
            {submitting ? 'Logging…' : 'Log care'}
          </Action>
        </Card.Footer>
      </form>
    </Dialog>
  )
}
