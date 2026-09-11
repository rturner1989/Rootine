import { createContext, type ReactNode, useCallback, useMemo, useState } from 'react'

type OrganiserContextValue = {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

export const OrganiserContext = createContext<OrganiserContextValue | null>(null)

export function OrganiserProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])

  const value = useMemo(() => ({ open, openDrawer, closeDrawer }), [open, openDrawer, closeDrawer])

  return <OrganiserContext.Provider value={value}>{children}</OrganiserContext.Provider>
}
