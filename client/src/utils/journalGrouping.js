const DAY_MS = 86_400_000

function isoDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function labelFor(dayKey, todayKey, yesterdayKey, occurredIso) {
  if (dayKey === todayKey) return 'Today'
  if (dayKey === yesterdayKey) return 'Yesterday'
  return new Date(occurredIso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function groupEntriesByDay(entries) {
  const todayKey = isoDateKey(new Date())
  const yesterdayKey = isoDateKey(new Date(Date.now() - DAY_MS))
  const groups = new Map()

  for (const entry of entries) {
    if (!entry.occurred_at) continue
    const dayKey = isoDateKey(new Date(entry.occurred_at))
    if (!groups.has(dayKey)) {
      groups.set(dayKey, {
        dayKey,
        label: labelFor(dayKey, todayKey, yesterdayKey, entry.occurred_at),
        entries: [],
      })
    }
    groups.get(dayKey).entries.push(entry)
  }

  return Array.from(groups.values())
}
