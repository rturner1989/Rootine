import Tile from '../form/Tile'

// Quick-add preset spaces — pick one to prefill name/category/icon. No icon
// on the chip itself: picking a preset preselects it in the IconPicker
// below, so a chip icon would just be redundant (and eats name width).
// Shown only on create (no presets when editing an existing space).
export default function PresetOptions({ presets, activeName, onPick }) {
  return (
    <div>
      <span className="block eyebrow-label text-ink-soft mb-2">Quick add</span>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {presets.map((preset) => (
          <Tile key={preset.name} size="chip" selected={preset.name === activeName} onClick={() => onPick(preset)}>
            {preset.name}
          </Tile>
        ))}
      </div>
    </div>
  )
}
