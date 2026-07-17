// Tinted circle holding a single identity emoji — the app's stat- and
// tile-icon disc. Decorative: the adjacent label always carries the
// meaning, so it stays out of the accessibility tree. Tint is a
// consumer concern; it varies per stat, not per disc.
export default function IconDisc({ tint = 'bg-mint text-emerald', className = '', children, ...kwargs }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center text-[17px] ${tint} ${className}`}
      {...kwargs}
    >
      {children}
    </span>
  )
}
