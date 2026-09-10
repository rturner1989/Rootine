import { faMobileScreen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function LandscapeLock() {
  return (
    <div
      role="alertdialog"
      aria-labelledby="landscape-lock-title"
      className="landscape-lock fixed inset-0 z-[200] items-center justify-center bg-[image:var(--gradient-mint)] p-8"
    >
      <div className="text-center max-w-xs">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 w-20 h-20 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-emerald text-3xl"
        >
          <FontAwesomeIcon icon={faMobileScreen} />
        </div>
        <h2 id="landscape-lock-title" className="font-display text-2xl italic text-forest leading-tight">
          Rotate your device
        </h2>
        <p className="mt-2 text-sm text-ink-soft leading-snug">Rootine is designed for portrait — please flip back.</p>
      </div>
    </div>
  )
}
