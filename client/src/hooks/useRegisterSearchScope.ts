import { type ReactNode, useEffect } from 'react'
import { useSearchActions } from './useSearch'

type UseRegisterSearchScopeOptions = {
  placeholder: string
  hasFilterToClear: boolean
  onClearAll: () => void
  renderResults: (params: { query: string }) => ReactNode
}

// useSearch.js / SearchContext.jsx aren't converted yet (Task 5/6
// territory) — TS infers useSearchActions()'s return as `never` from the
// still-untyped context. This describes the one method this hook calls;
// drop the cast once those files ship as .ts/.tsx.
type SearchActions = {
  registerScope: (scope: UseRegisterSearchScopeOptions) => () => void
}

// Pages call this on mount to declare what the shared search chrome
// (sidebar input on desktop, drawer on mobile) should show on their
// watch. The cleanup function unregisters on unmount, so leaving the
// page reverts the chrome to inactive.
//
// Keep `placeholder` and `onClearAll` referentially stable across
// renders — pass primitive strings and stable functions, or wrap with
// useCallback if the handler closes over changing state. An unstable
// scope object would re-register every render and reset the query.
export function useRegisterSearchScope({
  placeholder,
  hasFilterToClear,
  onClearAll,
  renderResults,
}: UseRegisterSearchScopeOptions): void {
  const { registerScope } = useSearchActions() as SearchActions

  useEffect(() => {
    const cleanup = registerScope({ placeholder, hasFilterToClear, onClearAll, renderResults })
    return cleanup
  }, [registerScope, placeholder, hasFilterToClear, onClearAll, renderResults])
}
