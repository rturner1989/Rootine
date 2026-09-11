import { createContext, type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

type SearchScope = {
  placeholder?: string
  hasFilterToClear?: boolean
  onClearAll?: () => void
  renderResults?: (args: { query: string }) => ReactNode
}

type SearchActionsContextValue = {
  isActive: boolean
  placeholder: string
  hasFilterToClear: boolean
  renderResults: SearchScope['renderResults'] | null
  setQuery: (query: string) => void
  clearAll: () => void
  registerScope: (scope: SearchScope) => () => void
  openMobileDrawer: () => void
  closeMobileDrawer: () => void
  sidebarInputRef: RefObject<HTMLInputElement | null>
}

type SearchStateContextValue = {
  query: string
  isMobileDrawerOpen: boolean
}

// Two contexts to avoid fan-out: actions/scope rarely change (page
// register/unregister, drawer toggle handlers), state changes per
// keystroke. Consumers subscribe only to what they read so a sidebar
// chrome re-render isn't paid for every drawer keystroke.
const SearchActionsContext = createContext<SearchActionsContextValue | null>(null)
const SearchStateContext = createContext<SearchStateContextValue | null>(null)

const DEFAULT_PLACEHOLDER = 'Search…'

export { SearchActionsContext, SearchStateContext }

export function SearchProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<SearchScope | null>(null)
  const [query, setQuery] = useState('')
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const sidebarInputRef = useRef<HTMLInputElement>(null)
  const isActive = scope !== null

  useEffect(() => {
    if (!isActive) return
    function handleKey(event: KeyboardEvent) {
      const cmdK = (isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (!cmdK) return
      event.preventDefault()
      sidebarInputRef.current?.focus()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isActive])

  const registerScope = useCallback((nextScope: SearchScope) => {
    setScope(nextScope)
    return () => {
      setScope((current) => (current === nextScope ? null : current))
      setQuery('')
      setMobileDrawerOpen(false)
    }
  }, [])

  const clearAll = useCallback(() => {
    setQuery('')
    scope?.onClearAll?.()
  }, [scope])

  const openMobileDrawer = useCallback(() => setMobileDrawerOpen(true), [])
  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false)
    setQuery('')
  }, [])

  const actionsValue = useMemo(
    () => ({
      isActive,
      placeholder: scope?.placeholder ?? DEFAULT_PLACEHOLDER,
      hasFilterToClear: Boolean(scope?.hasFilterToClear),
      renderResults: scope?.renderResults ?? null,
      setQuery,
      clearAll,
      registerScope,
      openMobileDrawer,
      closeMobileDrawer,
      sidebarInputRef,
    }),
    [isActive, scope, clearAll, registerScope, openMobileDrawer, closeMobileDrawer],
  )

  const stateValue = useMemo(() => ({ query, isMobileDrawerOpen }), [query, isMobileDrawerOpen])

  return (
    <SearchActionsContext.Provider value={actionsValue}>
      <SearchStateContext.Provider value={stateValue}>{children}</SearchStateContext.Provider>
    </SearchActionsContext.Provider>
  )
}
