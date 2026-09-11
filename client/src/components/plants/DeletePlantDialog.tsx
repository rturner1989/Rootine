import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useDeletePlant } from '../../hooks/usePlants'
import type { Plant } from '../../types/plant'
import TextInput from '../form/TextInput'
import ConfirmDialog from '../ui/ConfirmDialog'
import Avatar from './Avatar'

const TITLE = 'Delete plant'
const CONFIRM_TYPE_GUARD_DAYS = 30

function plantAgeInDays(plant: Plant | null): number {
  const anchor = plant?.acquired_at ?? plant?.created_at
  if (!anchor) return 0
  return Math.floor((Date.now() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24))
}

export type DeletePlantDialogProps = {
  plant: Plant | null
  open: boolean
  onClose: () => void
}

export default function DeletePlantDialog({ plant, open, onClose }: DeletePlantDialogProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const deletePlant = useDeletePlant()
  const typedInputRef = useRef<HTMLInputElement>(null)

  const [typedName, setTypedName] = useState('')

  const requiresTypedConfirm = plant ? plantAgeInDays(plant) >= CONFIRM_TYPE_GUARD_DAYS : false
  const typedMatches = !requiresTypedConfirm || typedName.trim() === plant?.nickname

  useEffect(() => {
    if (open) setTypedName('')
  }, [open])

  if (!plant) return null

  // Arrow-const, not a function declaration — TS carries the `if (!plant)
  // return null` narrowing above into a closure defined after the guard
  // only for non-hoisted bindings.
  const handleConfirm = async () => {
    if (!typedMatches) return
    try {
      await deletePlant.mutateAsync(plant.id)
      toast.success(`Deleted ${plant.nickname}`)
      navigate('/house')
    } catch (error) {
      toast.error("Couldn't delete that plant")
      throw error
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={TITLE}
      destructive
      confirmLabel="Delete"
      loadingLabel="Deleting…"
      loading={deletePlant.isPending}
      confirmDisabled={!typedMatches}
      initialFocusRef={requiresTypedConfirm ? typedInputRef : undefined}
    >
      <div className="flex flex-col items-center gap-2 py-2">
        <Avatar imageUrl={plant.species?.image_url} size="xl" shape="circle" />
        <p className="font-display italic text-lg text-ink">{plant.nickname}</p>
        {plant.species?.common_name && <p className="text-xs text-ink-soft">{plant.species.common_name}</p>}
      </div>

      <p className="text-sm text-ink leading-relaxed">
        This removes <strong className="font-bold">{plant.nickname}</strong> and all its care history. You can't undo
        this.
      </p>

      <details className="rounded-md bg-paper-deep/40 border border-paper-edge/40 px-3 py-2">
        <summary className="cursor-pointer text-xs font-bold text-ink-soft">What happens to photos?</summary>
        <p className="mt-2 text-xs text-ink-soft leading-relaxed">
          Photos attached to {plant.nickname} are deleted with the plant. Export them from the Journal beforehand if you
          want to keep them.
        </p>
      </details>

      {requiresTypedConfirm && (
        <TextInput
          ref={typedInputRef}
          label="Type the plant's name to confirm"
          type="text"
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          placeholder={plant.nickname}
          hint={
            <>
              Match exactly: <strong className="font-bold">{plant.nickname}</strong>
            </>
          }
          autoComplete="off"
        />
      )}
    </ConfirmDialog>
  )
}
