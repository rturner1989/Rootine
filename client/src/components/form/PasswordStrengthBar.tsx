import { usePasswordStrength } from '../../hooks/usePasswordStrength'

export type PasswordStrengthBarProps = {
  password: string
}

// 4-segment horizontal bar filled 0-4 times depending on the password's
// composition. Renders nothing for an empty password.
export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { strength, barClass } = usePasswordStrength(password)

  if (strength === 0) return null

  return (
    <div className="flex gap-1 mt-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? barClass : 'bg-mint'}`} />
      ))}
    </div>
  )
}
