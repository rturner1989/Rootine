import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { CSSProperties } from 'react'
import Action from './Action'

const KIND_STYLES = {
  success: {
    chipBg: 'bg-[image:var(--gradient-toast-success)]',
    chipText: 'text-paper',
    glyph: '✓',
    emColor: 'var(--emerald)',
    role: 'status',
    ariaLive: 'polite',
  },
  error: {
    chipBg: 'bg-[image:var(--gradient-toast-error)]',
    chipText: 'text-paper',
    glyph: '!',
    emColor: 'var(--coral-deep)',
    role: 'alert',
    ariaLive: 'assertive',
  },
  warn: {
    chipBg: 'bg-[image:var(--gradient-toast-warn)]',
    chipText: 'text-paper',
    glyph: '⏱',
    emColor: 'var(--sunshine-deep)',
    role: 'alert',
    ariaLive: 'assertive',
  },
  info: {
    chipBg: 'bg-[image:var(--gradient-toast-info)]',
    chipText: 'text-paper',
    glyph: 'i',
    emColor: 'var(--sky-deep)',
    role: 'status',
    ariaLive: 'polite',
  },
  undo: {
    chipBg: 'bg-[image:var(--gradient-toast-undo)]',
    chipText: 'text-forest',
    glyph: '↩',
    emColor: 'var(--forest)',
    role: 'status',
    ariaLive: 'polite',
  },
  loading: {
    chipBg: 'bg-paper-deep',
    chipText: 'text-ink-soft',
    glyph: null,
    emColor: 'var(--emerald)',
    role: 'status',
    ariaLive: 'polite',
  },
} as const satisfies Record<
  string,
  { chipBg: string; chipText: string; glyph: string | null; emColor: string; role: string; ariaLive: string }
>

export type ToastKind = keyof typeof KIND_STYLES

type ToastStyleRecipe = (typeof KIND_STYLES)[ToastKind]

export type ToastAction = {
  label: string
  onClick: () => void
}

export type ToastItem = {
  id: number
  kind: ToastKind
  title?: string
  meta?: string
  action?: ToastAction
}

const CHIP_SHADOW =
  'shadow-[0_6px_14px_-4px_rgba(11,58,26,0.3),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(11,58,26,0.08)]'

type ChipProps = {
  kind: ToastKind
  styles: ToastStyleRecipe
}

function Chip({ kind, styles }: ChipProps) {
  if (kind === 'loading') {
    return (
      <div className={`relative w-9 h-9 rounded-full flex-shrink-0 ${styles.chipBg}`} aria-hidden="true">
        <div className="absolute inset-[7px] rounded-full border-[2.5px] border-ink/15 border-t-emerald toast-chip-spin" />
      </div>
    )
  }

  return (
    <div
      className={`toast-chip-highlight w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-base font-extrabold ${CHIP_SHADOW} ${styles.chipBg} ${styles.chipText}`}
      aria-hidden="true"
    >
      <span className="relative z-10">{styles.glyph}</span>
    </div>
  )
}

type ToastProps = {
  id: number
  kind: ToastKind
  title?: string
  meta?: string
  action?: ToastAction
  onDismiss: (id: number) => void
  styles: ToastStyleRecipe
}

function Toast({ id, kind, title, meta, action, onDismiss, styles }: ToastProps) {
  const dismissable = kind !== 'loading'
  const isUndo = kind === 'undo'

  return (
    <div
      role={styles.role}
      aria-live={styles.ariaLive}
      className="glass-card flex items-center gap-3 pl-2.5 pr-3.5 py-2.5 rounded-md w-full sm:w-[360px] text-[13px] text-ink"
      // CSSProperties doesn't model custom properties — this only reaches
      // the DOM as a style attribute, so the cast is purely to satisfy the
      // type, not to bypass any check on the value itself.
      style={{ '--toast-em-color': styles.emColor } as CSSProperties}
    >
      <Chip kind={kind} styles={styles} />

      <div className="flex-1 min-w-0 pr-1">
        <div className="font-extrabold leading-tight">{title}</div>
        {meta && <div className="font-display italic text-[12px] text-ink-soft mt-0.5">{meta}</div>}
      </div>

      {action &&
        (isUndo ? (
          <Action
            variant="unstyled"
            onClick={action.onClick}
            className="px-3 py-1.5 rounded-full text-[12px] font-extrabold flex-shrink-0 bg-mint hover:bg-mint-2 text-forest transition-colors"
          >
            {action.label}
          </Action>
        ) : (
          <Action
            variant="unstyled"
            onClick={action.onClick}
            className="px-3 py-1.5 rounded-full text-[12px] font-extrabold flex-shrink-0 bg-ink/5 hover:bg-ink/10 transition-colors"
            style={{ color: styles.emColor }}
          >
            {action.label}
          </Action>
        ))}

      {dismissable && (
        <Action
          variant="unstyled"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss"
          className="w-6 h-6 rounded-full bg-ink/5 hover:bg-ink/10 text-ink-softer hover:text-ink flex items-center justify-center text-[11px] flex-shrink-0 transition-colors p-0"
        >
          <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
        </Action>
      )}
    </div>
  )
}

export type ToastContainerProps = {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const shouldReduceMotion = useReducedMotion()

  const motionProps = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, x: 60 },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, y: 24 },
        transition: { duration: 0.28, ease: 'easeOut' as const },
      }

  return (
    <div className="fixed left-4 right-4 sm:left-auto z-50 flex flex-col gap-2.5 sm:items-end pointer-events-none top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] sm:top-auto sm:bottom-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))]">
      <AnimatePresence>
        {toasts.map((toastItem) => {
          const styles = KIND_STYLES[toastItem.kind] ?? KIND_STYLES.info
          return (
            <motion.div key={toastItem.id} layout className="pointer-events-auto w-full sm:w-[360px]" {...motionProps}>
              <Toast
                id={toastItem.id}
                kind={toastItem.kind}
                title={toastItem.title}
                meta={toastItem.meta}
                action={toastItem.action}
                onDismiss={onDismiss}
                styles={styles}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
