import { motion } from 'motion/react'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Emphasis from '../ui/Emphasis'
import Heading from '../ui/Heading'
import Preheading from '../ui/Preheading'
import { MORPH_TRANSITION } from '../wizard/WizardCard'

const PORTRAIT_URL = '/onboarding/monstera.webp'

const MotionCard = motion.create(Card)

// Children mirror their entry/exit so the welcome ↔ wizard transition
// reverses cleanly on Back. Entry delays line up with WizardCard's
// layoutId morph completing (~0.8s in Welcome.jsx) — the card finishes
// shrinking back into place, then text/img/caption fade in.
const textVariants = {
  initial: { x: -40, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.3, delay: 0.8, ease: 'easeOut' } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

const imageVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 0.75, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: 'easeOut' } },
}

const captionVariants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.9, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeOut' } },
}

export default function Step0Welcome({ onNext }) {
  return (
    <section
      aria-labelledby="welcome-heading"
      className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-16 max-w-[1100px] w-full mx-auto py-6 lg:py-12"
    >
      <motion.div
        variants={textVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="text-center lg:text-left"
      >
        <Preheading className="mb-4">Begin here</Preheading>

        <Heading id="welcome-heading" variant="display-xl" className="text-ink mb-5">
          Say hello to <Emphasis className="block">your greenhouse.</Emphasis>
        </Heading>

        <p className="text-sm leading-relaxed text-ink-soft max-w-[400px] mx-auto lg:mx-0 mb-5">
          <span className="step0-dropcap">A</span>
          place for every plant you've met. Water, feed, notice. Watch them grow. Write a little. Forget sometimes —
          it's allowed.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 mt-4">
          <Action variant="primary" onClick={onNext}>
            Let's meet them →
          </Action>
          <span className="font-display italic text-[13px] text-ink-soft">takes about two minutes</span>
        </div>
      </motion.div>

      <figure className="relative w-[260px] h-[340px] lg:w-[360px] lg:h-[460px] mx-auto m-0">
        <MotionCard
          layoutId="wizard-frame"
          transition={MORPH_TRANSITION}
          style={{ borderRadius: 14 }}
          className="absolute inset-0 p-1.5"
        >
          <motion.img
            src={PORTRAIT_URL}
            alt=""
            className="w-full h-full object-contain"
            variants={imageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
        </MotionCard>

        <motion.figcaption
          variants={captionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-paper px-6 py-2 lg:px-4 rounded-full shadow-warm-sm flex items-center gap-2 z-10 whitespace-nowrap"
        >
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-leaf" />
          <em className="font-display italic font-normal text-xs text-ink">Monstera deliciosa</em>
        </motion.figcaption>
      </figure>
    </section>
  )
}
