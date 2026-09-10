// Local-date helpers for native <input type="date"> values.
// The native picker emits + accepts "YYYY-MM-DD" strings in the user's
// LOCAL calendar — we deliberately don't go through Date.toISOString(),
// which is UTC and would shift the date by ±1 in non-UTC timezones late
// in the day.

export function todayISO(): string {
  const now = new Date()
  return formatLocalDate(now)
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
