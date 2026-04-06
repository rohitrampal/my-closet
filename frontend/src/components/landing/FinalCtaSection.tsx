import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'
import { Reveal } from '@/components/landing/Reveal'

export function FinalCtaSection() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <section className="relative px-4 pb-20 pt-6 sm:pb-28 sm:pt-8 md:pb-32">
      <Reveal className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/20 via-background/95 to-primary/10 p-8 shadow-glow sm:rounded-3xl sm:p-12 md:p-16">
        <motion.div
          className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl"
          animate={reduce ? undefined : { x: [0, 16, 0], y: [0, 8, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
          animate={reduce ? undefined : { x: [0, -12, 0], y: [0, -10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />

        <div className="relative text-center">
          <p className="text-sm font-medium text-fuchsia-300/90">{t('landing.finalEyebrow')}</p>
          <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-foreground sm:mt-5 sm:text-4xl md:text-5xl">
            {t('landing.finalTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted sm:text-base">{t('landing.finalSub')}</p>
          <div className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mx-auto sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
            <LandingCtaLink variant="light" className="w-full sm:w-auto" />
            <motion.div
              className="w-full sm:w-auto"
              whileTap={reduce ? undefined : { scale: 0.98 }}
            >
              <Link
                to="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-foreground transition-[box-shadow,background-color] hover:border-primary/35 hover:bg-surface hover:shadow-soft sm:px-8 sm:text-base"
              >
                {t('landing.finalHasAccess')}
              </Link>
            </motion.div>
          </div>
        </div>
      </Reveal>

      <footer className="mx-auto mt-16 max-w-5xl border-t border-border pt-10 text-center text-sm text-muted">
        <p>{t('landing.footerMade')}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
          <a href="#how-it-works" className="transition-colors hover:text-primary-soft">
            {t('landing.footerHow')}
          </a>
          <Link to="/login" className="transition-colors hover:text-primary-soft">
            {t('landing.footerLogin')}
          </Link>
          <Link to="/signup" className="transition-colors hover:text-primary-soft">
            {t('landing.footerSignup')}
          </Link>
        </div>
      </footer>
    </section>
  )
}
