import { useId } from 'react'
import { SPACE_ICON_OPTIONS } from '../../utils/spaceIcons'

// Native radios with sr-only inputs inside `<label>` wrappers — same
// pattern as SegmentedControl. The browser handles arrow-key navigation +
// roving focus across same-name radios for free, and focus-visible styling
// on the visual swatch is driven by the input's focus state via Tailwind's
// `has-[…]` modifier. Each instance gets its own radio-group name (useId)
// so two pickers can coexist without grouping into each other.
export default function IconPicker({ value, onChange }) {
  const groupName = useId()
  return (
    <div>
      <span className="block eyebrow-label text-ink-soft mb-2">Icon</span>
      <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 gap-2">
        {SPACE_ICON_OPTIONS.map((option) => {
          const checked = option.slug === value
          return (
            <label
              key={option.slug}
              aria-label={option.label}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-shadow cursor-pointer has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-emerald/30 ${
                checked
                  ? 'bg-mint text-emerald shadow-warm-sm ring-2 ring-inset ring-emerald'
                  : 'bg-paper-deep text-ink-soft hover:bg-mint/60'
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={option.slug}
                checked={checked}
                onChange={() => onChange(option.slug)}
                className="sr-only"
              />
              <span aria-hidden="true">{option.emoji}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
