import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/landing/GlassCard'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'

export function BeforeAfterSection() {
  const { t } = useTranslation()

  return (
    <section
      className="relative px-4 py-10 md:py-14"
      aria-labelledby="before-after-heading"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2
            id="before-after-heading"
            className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl"
          >
            <span className="block">{t('landing.beforeAfter.title1')}</span>
            <span className="mt-1 block text-fuchsia-200/95">{t('landing.beforeAfter.title2')}</span>
          </h2>
        </Reveal>

        <div className="mt-8 flex flex-col gap-4 md:mt-10 md:grid md:grid-cols-2 md:gap-6">
          <Reveal delay={0.05} className="h-full">
            <TiltCard className="h-full">
              <GlassCard padding="none" className="h-full p-5 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t('landing.beforeAfter.beforeLabel')}
                </p>
                <h3 className="font-display mt-1 text-lg font-semibold text-foreground md:text-xl">
                  {t('landing.beforeAfter.beforeTitle')}
                </h3>
                <div className="mt-4 space-y-3 rounded-xl bg-surface/60 p-4 ring-1 ring-white/5">
                  <div className="flex gap-3 opacity-70">
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-surface-light" />
                    <div className="flex flex-1 flex-col justify-center gap-1.5">
                      <div className="h-2 w-3/4 rounded bg-muted/40" />
                      <div className="h-2 w-1/2 rounded bg-surface-light" />
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">
                    <span className="block">{t('landing.beforeAfter.beforeLine1')}</span>
                    <span className="block">{t('landing.beforeAfter.beforeLine2')}</span>
                    <span className="block">{t('landing.beforeAfter.beforeLine3')}</span>
                  </p>
                </div>
              </GlassCard>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.1} className="h-full">
            <TiltCard className="h-full">
              <GlassCard padding="none" className="h-full border-fuchsia-500/20 p-5 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400/90">
                  {t('landing.beforeAfter.afterLabel')}
                </p>
                <h3 className="font-display mt-1 text-lg font-semibold text-foreground md:text-xl">
                  {t('landing.beforeAfter.afterTitle')}
                </h3>
                <div className="mt-4 space-y-3 rounded-xl bg-gradient-to-br from-fuchsia-950/40 to-violet-950/30 p-4 ring-1 ring-fuchsia-500/20">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-rose-400/50 to-fuchsia-600/40" />
                    <ul className="flex flex-1 flex-col justify-center gap-1 text-sm text-foreground">
                      <li className="font-medium text-foreground">{t('landing.heroDemoTop')}</li>
                      <li>{t('landing.heroDemoBottom')}</li>
                      <li className="text-muted">{t('landing.heroDemoFootwear')}</li>
                    </ul>
                  </div>
                  <p className="text-sm leading-relaxed text-fuchsia-200/85">
                    <span className="block">{t('landing.beforeAfter.afterLine1')}</span>
                    <span className="block">{t('landing.beforeAfter.afterLine2')}</span>
                    <span className="block">{t('landing.beforeAfter.afterLine3')}</span>
                  </p>
                </div>
              </GlassCard>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
