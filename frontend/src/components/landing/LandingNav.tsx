import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useUiStore } from '@/stores/useUiStore'

export function LandingNav() {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const reduce = useReducedMotion()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <motion.header
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-4 sm:px-4 sm:pt-6"
      initial={reduce ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav
        className="pointer-events-auto relative flex w-full max-w-5xl items-center gap-2 rounded-2xl border border-border bg-background/55 px-3 py-2 shadow-lg shadow-glow backdrop-blur-xl sm:gap-3 sm:rounded-full sm:px-6 sm:py-2.5"
        aria-label={t('landing.navAria')}
      >
        <Link
          to="/"
          className="font-display shrink-0 text-sm font-semibold tracking-tight text-gradient min-[380px]:text-base sm:text-xl"
        >
          {t('landing.navAppName')}
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
          <Card
            padding="none"
            radius="button"
            className="flex shrink-0 items-center gap-1 p-1 shadow-soft"
          >
            <span id="landing-lang-label" className="sr-only">
              {t('common.language')}
            </span>
            <Button
              type="button"
              variant={language === 'en' ? 'secondary' : 'ghost'}
              className="min-h-8 px-2 py-1 text-[11px] min-[380px]:min-h-9 min-[380px]:px-3 min-[380px]:text-xs"
              aria-pressed={language === 'en'}
              aria-labelledby="landing-lang-label"
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
            <Button
              type="button"
              variant={language === 'hi' ? 'secondary' : 'ghost'}
              className="min-h-8 px-2 py-1 text-[11px] min-[380px]:min-h-9 min-[380px]:px-3 min-[380px]:text-xs"
              aria-pressed={language === 'hi'}
              aria-labelledby="landing-lang-label"
              onClick={() => setLanguage('hi')}
            >
              हि
            </Button>
          </Card>
          <Link
            to="/login"
            className="hidden shrink-0 rounded-full px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground min-[380px]:inline-flex min-[380px]:px-3 min-[380px]:text-sm sm:px-4 sm:py-2"
          >
            {t('landing.navLogin')}
          </Link>
          <Link
            to="/signup"
            className="hidden shrink-0 rounded-full px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground min-[380px]:px-3 min-[380px]:text-sm sm:inline-flex sm:px-4"
          >
            {t('landing.navSignup')}
          </Link>
          <LandingCtaLink className="max-w-[min(42vw,10rem)] px-2.5 py-1.5 text-[11px] leading-tight min-[380px]:max-w-42 min-[380px]:px-3 min-[380px]:text-xs sm:max-w-none sm:px-5 sm:py-2 sm:text-sm sm:leading-snug" />
          <Button
            type="button"
            variant="ghost"
            className="min-h-8 min-w-8 rounded-full p-1.5 text-foreground sm:hidden"
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex h-4 w-4 flex-col items-center justify-center gap-0.5">
              <span className="h-0.5 w-3 rounded bg-current" />
              <span className="h-0.5 w-3 rounded bg-current" />
              <span className="h-0.5 w-3 rounded bg-current" />
            </span>
          </Button>
        </div>
        {isMobileMenuOpen ? (
          <Card
            id="landing-mobile-menu"
            padding="none"
            radius="button"
            className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-50 flex flex-col gap-1 border border-border bg-background/95 p-2 shadow-lg shadow-glow sm:hidden"
          >
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center rounded-(--radius-button) px-3 text-sm font-medium text-foreground/90 transition-colors hover:bg-surface"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('landing.navLogin')}
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-10 items-center rounded-(--radius-button) px-3 text-sm font-medium text-foreground/90 transition-colors hover:bg-surface"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('landing.navSignup')}
            </Link>
            <LandingCtaLink
              className="mt-1 w-full"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </Card>
        ) : null}
      </nav>
    </motion.header>
  )
}
