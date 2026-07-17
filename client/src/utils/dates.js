// Locale-resolved long date ("12 March 2026" in en-GB, "March 12, 2026"
// in en-US) — matches how the rest of the app renders dates, which all
// defer to the reader's locale rather than pinning a format.
// Returns null for missing or unparseable input so callers can branch
// instead of rendering "Invalid Date".
export function formatLongDate(iso) {
  if (!iso) return null

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}
