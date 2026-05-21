const PLANT_THUMB_SIZE = {
  sm: { box: 'w-4 h-4', text: 'text-[10px]' },
  md: { box: 'w-5 h-5', text: 'text-[11px]' },
}

// Round plant avatar used both in the filter's plant chips and the
// active-filter badges. Falls back to a leaf glyph when the species has
// no image.
export default function PlantThumb({ src, size = 'md' }) {
  const recipe = PLANT_THUMB_SIZE[size] ?? PLANT_THUMB_SIZE.md
  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={`${recipe.box} rounded-full bg-paper inline-flex items-center justify-center shrink-0 ${recipe.text}`}
      >
        🌿
      </span>
    )
  }
  return <img src={src} alt="" className={`${recipe.box} rounded-full object-cover shrink-0`} />
}
