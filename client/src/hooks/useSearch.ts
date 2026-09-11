import { useContext } from 'react'
import { SearchActionsContext, SearchStateContext } from '../context/SearchContext'

// Re-renders only when actions/scope change (page register, drawer
// toggle handlers, scope props). Use for chrome consumers that don't
// read the live query — Sidebar trigger gating, MobileTopBar trigger,
// AppLayout route-change cleanup.
export function useSearchActions() {
  const value = useContext(SearchActionsContext)
  if (!value) {
    throw new Error('useSearchActions must be used inside a <SearchProvider>')
  }
  return value
}

// Re-renders on every keystroke. Use only where the query value or
// drawer-open flag is read for filtering / rendering.
export function useSearchState() {
  const value = useContext(SearchStateContext)
  if (!value) {
    throw new Error('useSearchState must be used inside a <SearchProvider>')
  }
  return value
}

// Convenience for consumers that genuinely need both. Re-renders when
// either context updates. Drawer + result renderers use this.
export function useSearch() {
  return { ...useSearchActions(), ...useSearchState() }
}
