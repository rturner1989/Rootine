import Action from './Action'

// Action's universal focus ring is ring-4, which swallows a 24px-tall
// pill — narrow it rather than let it fill the track.
const TRACK =
  'relative shrink-0 w-[42px] h-[24px] rounded-full transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald/40 disabled:opacity-60 disabled:cursor-not-allowed'
const TRACK_ON = 'bg-leaf'
// paper-edge alone sits at 1.3:1 against the paper card behind it, so
// the off state needs its own outline to stay a visible control at all
// (WCAG 1.4.11). The mockup omits this.
const TRACK_OFF = 'bg-paper-edge ring-1 ring-ink-softer'

const KNOB =
  'absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-paper shadow-warm-sm transition-transform duration-150'
const KNOB_ON = 'translate-x-[18px]'

// Binary on/off switch. `role="switch"` rather than a checkbox: the
// change applies immediately, there's no form to submit. Needs a `label`
// — knob position is the only other signal, so without one a screen
// reader announces "switch, on" and nothing else.
export default function Toggle({ checked = false, onChange, label, disabled = false, className = '', ...kwargs }) {
  return (
    <Action
      variant="unstyled"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${TRACK} ${checked ? TRACK_ON : TRACK_OFF} ${className}`}
      {...kwargs}
    >
      <span aria-hidden="true" className={`${KNOB} ${checked ? KNOB_ON : ''}`} />
    </Action>
  )
}
