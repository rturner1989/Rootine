import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

// Thin loading indicator tied to TanStack Query's global isFetching count.
// Debounces the SHOW by 120ms so fast requests (<120ms) don't flash a bar —
// otherwise the mobile view would see it near-constantly from background
// refetches. Lingers 260ms after the count returns to zero so the "finished"
// flash is visible.
export default function ProgressBar() {
  const fetching = useIsFetching()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (fetching > 0) {
      const showTimer: ReturnType<typeof setTimeout> = setTimeout(() => setVisible(true), 120)
      return () => clearTimeout(showTimer)
    }
    const hideTimer: ReturnType<typeof setTimeout> = setTimeout(() => setVisible(false), 260)
    return () => clearTimeout(hideTimer)
  }, [fetching])

  if (!visible) return null

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed top-[calc(env(safe-area-inset-top)+62px)] lg:top-0 left-0 right-0 h-[3px] z-[55] bg-mint overflow-hidden pointer-events-none"
    >
      <div className="h-full w-1/4 bg-leaf progress-bar-sweep" />
    </div>
  )
}
