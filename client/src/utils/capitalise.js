// Upper-cases the first character of a string, leaving the rest as-is —
// for display labels built from lowercase domain values ('beginner' →
// 'Beginner', 'bright' → 'Bright'). Safely returns '' for empty/nullish input.
export function capitalise(text) {
  if (!text) return ''

  return text.charAt(0).toUpperCase() + text.slice(1)
}
