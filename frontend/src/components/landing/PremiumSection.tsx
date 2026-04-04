import { motion, useReducedMotion } from 'framer-motion'
import { GlassCard } from '@/components/landing/GlassCard'
import { LANDING_PRIMARY_CTA } from '@/components/landing/landingCopy'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'
import { Reveal } from '@/components/landing/Reveal'

const perks = [
  'Unlimited AI outfit generations',
  'Priority seasonal capsule drops',
  'Advanced palette & body fit tuning',
  'Share templates & moodboards',
]

export function PremiumSection() {
  const reduce = useReducedMotion()

  return (
    <section className="relative px-4 py-12 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-fuchsia-950/30 via-transparent to-violet-950/25" />

      <div className="relative mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-300/80">
            Pauua Premium
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Want even better outfits?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
            <span className="block">Unlock smarter styling, deeper personalization,</span>
            <span className="mt-1 block">and outfits that just feel right.</span>
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 md:mt-10">
          <GlassCard className="relative overflow-hidden p-8 sm:p-10">
            <motion.div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-fuchsia-500/25 to-violet-600/20 blur-3xl"
              animate={
                reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }
              }
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <div className="relative">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Simple pricing</p>
                  <p className="font-display mt-1 text-4xl font-bold text-white sm:text-5xl">
                    $12
                    <span className="text-lg font-medium text-zinc-500">/mo</span>
                  </p>
                </div>
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-200">
                  Early access
                </span>
              </div>
              <ul className="mt-8 space-y-3">
                {perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-center gap-3 text-sm text-zinc-300"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/40 to-violet-600/40 text-[10px] text-white">
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
              <div className="mt-8 md:mt-10">
                <LandingCtaLink className="w-full py-4">
                  {LANDING_PRIMARY_CTA}
                </LandingCtaLink>
              </div>
              <p className="mt-4 text-center text-xs text-zinc-500">
                Cancel anytime · No hidden fees
              </p>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  )
}
