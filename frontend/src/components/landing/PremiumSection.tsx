import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/landing/GlassCard'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'
import { Reveal } from '@/components/landing/Reveal'

const PERK_KEYS = ['premiumPerk1', 'premiumPerk2', 'premiumPerk3', 'premiumPerk4'] as const

export function PremiumSection() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <section className="relative px-4 py-12 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-fuchsia-950/30 via-transparent to-violet-950/25" />

      <div className="relative mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-300/80">
            {t('landing.premiumEyebrow')}
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('landing.premiumTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            <span className="block">{t('landing.premiumSub1')}</span>
            <span className="mt-1 block">{t('landing.premiumSub2')}</span>
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 md:mt-10">
          <GlassCard padding="none" className="relative overflow-hidden p-8 sm:p-10">
            <motion.div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-fuchsia-500/25 to-violet-600/20 blur-3xl"
              animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <div className="relative">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">{t('landing.premiumSimplePricing')}</p>
                  <p className="font-display mt-1 text-4xl font-bold text-foreground sm:text-5xl">
                    {t('landing.premiumPrice')}
                    <span className="text-lg font-medium text-muted">{t('landing.premiumPerMonth')}</span>
                  </p>
                </div>
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-200">
                  {t('landing.premiumEarlyAccess')}
                </span>
              </div>
              <ul className="mt-8 space-y-3">
                {PERK_KEYS.map((key) => (
                  <li key={key} className="flex items-center gap-3 text-sm text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary/50 to-accent/40 text-[10px] text-[var(--color-bg)]">
                      ✓
                    </span>
                    {t(`landing.${key}`)}
                  </li>
                ))}
              </ul>
              <div className="mt-8 md:mt-10">
                <LandingCtaLink className="w-full py-4" />
              </div>
              <p className="mt-4 text-center text-xs text-muted">{t('landing.premiumCancelNote')}</p>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  )
}
