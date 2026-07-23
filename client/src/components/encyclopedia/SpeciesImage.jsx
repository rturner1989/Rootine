import { useState } from 'react'

// The species photo: the real image_url when we have one, falling back to the
// emoji-on-gradient tile when it's missing OR fails to load (Wikipedia URLs
// 404 occasionally). Same box either way — `className` sizes the container so
// grid cells and the detail hero share one component. Decorative: the species
// name carries the meaning, so the image is aria-hidden.
export default function SpeciesImage({ imageUrl, className = '' }) {
  const [errored, setErrored] = useState(false)

  if (imageUrl && !errored) {
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setErrored(true)}
        className={`object-cover rounded-[10px] ${className}`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`species-photo rounded-[10px] flex items-center justify-center text-[54px] ${className}`}
    >
      🌿
    </span>
  )
}
