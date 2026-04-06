import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'

const FEATURE_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const

const featureIcons = [
  (
    <svg
      key="i1"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125a1.125 1.125 0 0 1 1.125-1.125h9.75a1.125 1.125 0 0 1 1.125 1.125v11.25A3.75 3.75 0 0 1 9 21h-2.25Z"
      />
    </svg>
  ),
  (
    <svg
      key="i2"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  ),
  (
    <svg
      key="i3"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  ),
  (
    <svg
      key="i4"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 5.314 5.886 3.314a2.25 2.25 0 0 0 2.25 0l5.886-3.314m-11.136-5.314L21 7.5"
      />
    </svg>
  ),
  (
    <svg
      key="i5"
      className="h-6 w-6"
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
  (
    <svg
      key="i6"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5h7.5a4.5 4.5 0 0 0 0-9h-7.5a4.5 4.5 0 0 0-4.5 4.5Z"
      />
    </svg>
  ),
]

export function FeaturesSection() {
  const { t } = useTranslation()

  return (
    <section className="relative px-4 py-12 md:py-20">
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-300/80">
            {t('landing.featuresEyebrow')}
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('landing.featuresTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted sm:text-base">
            {t('landing.featuresSubtitle')}
          </p>
        </Reveal>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 md:mt-10 lg:grid-cols-3">
          {FEATURE_KEYS.map((key, i) => (
            <Reveal key={key} delay={(i % 3) * 0.04} className="h-full">
              <TiltCard className="h-full">
                <div className="flex min-h-[5.5rem] h-full gap-4 rounded-xl border border-border bg-surface/30 p-4 shadow-soft backdrop-blur-md transition-colors hover:border-primary/20 hover:bg-surface-light/40 sm:min-h-0 sm:p-5 md:p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/15 to-violet-600/20 text-fuchsia-200 ring-1 ring-white/10 sm:h-11 sm:w-11">
                    {featureIcons[i]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-foreground">
                      {t(`landing.features.${key}.title`)}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {t(`landing.features.${key}.body`)}
                    </p>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
