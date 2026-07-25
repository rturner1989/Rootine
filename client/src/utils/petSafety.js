// The server ships pet_safe as a tri-state: true (known safe), false (known
// toxic), null (unknown). Unknown must never render as a safety claim — it
// gets its own neutral treatment, not a green "safe".
export function petSafetyLabel(petSafe) {
  if (petSafe === true) return { text: 'Pet-safe', tone: 'safe' }
  if (petSafe === false) return { text: 'Toxic to pets', tone: 'toxic' }
  return { text: 'Pet safety unknown', tone: 'unknown' }
}
