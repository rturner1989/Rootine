// Local-time YYYY-MM-DD key for bucketing timestamps by calendar day.
// Local (not UTC) so an 11pm watering lands on the day the user lived it,
// matching how the Timeline groups — both surfaces must agree on "which
// day" or the same event would sit on different days in each view.
export function isoDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
