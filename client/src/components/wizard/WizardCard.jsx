import { motion } from 'motion/react'
import Card from '../ui/Card'

const MotionCard = motion.create(Card)

const SHELL =
  'flex flex-col gap-4 p-6 w-full max-w-md sm:max-w-[820px] mx-auto rounded-md shadow-warm-md flex-1 min-h-0 sm:flex-none sm:h-[600px] h-[540px] text-center'

// Layout morph transition shared by both ends of the welcome ↔ wizard
// boundary (Step 0's MotionCard + this WizardCard). Framer uses the
// target element's transition for shared layoutId, so both ends carry
// the same constant — keeps forward + backward symmetric.
//
// Sequence either way: content fade (~0.2-0.3s) → card morph (delayed
// 0.3s, runs 0.5s) → next-side content fade in.
export const MORPH_TRANSITION = { duration: 0.5, ease: [0.33, 1, 0.68, 1], delay: 0.3 }

// `borderRadius` lives on style (not the class) so framer can animate it
// independently of the layout scale — otherwise rect interpolation scales
// the corners visually, making them look rounder mid-morph.
const RADIUS_STYLE = { borderRadius: 14 }

export default function WizardCard({ children }) {
  return (
    <MotionCard layoutId="wizard-frame" transition={MORPH_TRANSITION} style={RADIUS_STYLE} className={SHELL}>
      {children}
    </MotionCard>
  )
}
