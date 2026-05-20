import { useEffect, useRef } from 'react'

// Infinite-scroll trigger. Returns a ref to attach to a sentinel element at
// the end of a list; fires fetchNextPage once the sentinel scrolls within
// 200px of the viewport. No-ops when there's no next page or a fetch is in
// flight. fetchNextPage is stable from TanStack, so the effect re-binds only
// when hasNextPage / isFetchingNextPage flip.
export function useInfiniteScrollSentinel({ hasNextPage, isFetchingNextPage, fetchNextPage }) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    if (!hasNextPage) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return sentinelRef
}
