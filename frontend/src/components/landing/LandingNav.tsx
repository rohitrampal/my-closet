import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'

export function LandingNav() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <motion.header
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-4 sm:px-4 sm:pt-6"
      initial={reduce ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav
        className="pointer-events-auto flex w-full max-w-5xl items-center gap-2 rounded-full border border-border bg-background/55 px-3 py-2 shadow-lg shadow-glow backdrop-blur-xl sm:gap-3 sm:px-6 sm:py-2.5"
        aria-label={t('landing.navAria')}
      >
        <Link
          to="/"
          className="font-display shrink-0 text-base font-semibold tracking-tight text-gradient sm:text-xl"
        >
          {t('landing.navAppName')}
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
          <Link
            to="/login"
            className="shrink-0 rounded-full px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground min-[380px]:px-3 min-[380px]:text-sm sm:px-4"
          >
            {t('landing.navLogin')}
          </Link>
          <LandingCtaLink className="max-w-[min(52vw,11.5rem)] px-2 py-2 text-[10px] leading-tight min-[380px]:max-w-none min-[380px]:px-3 min-[380px]:text-xs sm:max-w-none sm:px-5 sm:text-sm sm:leading-snug" />
        </div>
      </nav>
    </motion.header>
  )
}
