// Score 0 never reaches `strengthBarClass` in practice — at strength 0
// the `i < strength` check in the caller is always false, so no bars are
// filled. The four tiers:
//   1 → coral    (weak — just meets length)
//   2 → sunshine (fair — length + mixed case)
//   3 → leaf     (good — length + case + digit)
//   4 → emerald  (strong — all four criteria including a special char)
const STRENGTH_CLASSES = ['bg-coral', 'bg-coral', 'bg-sunshine', 'bg-leaf', 'bg-emerald']

type PasswordStrength = { strength: number; barClass: string | null }

export function usePasswordStrength(password: string): PasswordStrength {
  if (!password) return { strength: 0, barClass: null }

  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++

  return { strength, barClass: STRENGTH_CLASSES[strength] }
}
