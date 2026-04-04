import { motion, useReducedMotion } from 'framer-motion'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'

const steps = [
  {
    title: 'Digitize your closet',
    body: 'Snap or upload pieces. We learn your palette, fit, and favorites.',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008H12V8.25Z"
        />
      </svg>
    ),
  },
  {
    title: 'Set the vibe',
    body: 'Brunch, boardroom, or both—we match the occasion and the weather.',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.455 2.456Z"
        />
      </svg>
    ),
  },
  {
    title: 'Wear the look',
    body: 'Curated outfits with rationale. Save, tweak, and share in one tap.',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
    ),
  },
]

export function HowItWorksSection() {
  const reduce = useReducedMotion()

  return (
    <section id="how-it-works" className="relative scroll-mt-24 px-4 py-12 md:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-fuchsia-950/20 to-transparent py-32 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-300/80">
            How it works
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Three calm steps
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            No endless scrolling. Your closet becomes a living moodboard—then the AI does
            the pairing.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3 md:gap-5">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.06} className="h-full">
              <TiltCard className="h-full">
                <div className="group relative flex h-full min-h-[11rem] flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-black/20 backdrop-blur-xl transition-colors hover:border-fuchsia-500/25 hover:bg-white/[0.06] sm:p-6 md:min-h-0 md:p-7">
                  <motion.div
                    className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-600/25 text-fuchsia-200 ring-1 ring-white/10 md:mb-5"
                    whileHover={reduce ? undefined : { scale: 1.06, rotate: -3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    {step.icon}
                  </motion.div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Step {i + 1}
                  </span>
                  <h3 className="font-display mt-2 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                    {step.body}
                  </p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
