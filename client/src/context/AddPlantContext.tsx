import { createContext, type ReactNode, useCallback, useMemo, useState } from 'react'

type AddPlantOpenOptions = {
  defaultSpaceId?: number | null
}

type AddPlantState = {
  isOpen: boolean
  defaultSpaceId: number | null
}

type AddPlantContextValue = AddPlantState & {
  open: (opts?: AddPlantOpenOptions) => void
  close: () => void
}

const AddPlantContext = createContext<AddPlantContextValue | null>(null)

export default AddPlantContext

export function AddPlantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AddPlantState>({ isOpen: false, defaultSpaceId: null })

  const open = useCallback((opts: AddPlantOpenOptions = {}) => {
    setState({ isOpen: true, defaultSpaceId: opts.defaultSpaceId ?? null })
  }, [])

  const close = useCallback(() => {
    setState({ isOpen: false, defaultSpaceId: null })
  }, [])

  const value = useMemo(
    () => ({
      isOpen: state.isOpen,
      defaultSpaceId: state.defaultSpaceId,
      open,
      close,
    }),
    [state, open, close],
  )

  return <AddPlantContext.Provider value={value}>{children}</AddPlantContext.Provider>
}
