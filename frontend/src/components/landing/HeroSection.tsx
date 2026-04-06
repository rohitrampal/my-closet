import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/landing/GlassCard'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'
import { TiltCard } from '@/components/landing/TiltCard'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Public folder assets (filenames include spaces — encode for URLs). */
const HERO_SLOT_IMAGES = {
  top: '/Merino crew.avif',
  bottom: '/Wide pleat trousers.jpg',
  footwear: '/Leather loafer.avif',
} as const

function HeroOutfitCard() {
  const { t } = useTranslation()
  return (
    <GlassCard padding="none" className="overflow-hidden">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fuchsia-300/90">
          {t('landing.heroCardBadge')}
        </p>
      </div>
      <div className="divide-y divide-border">
        <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
            <img
              src={encodeURI(HERO_SLOT_IMAGES.top)}
              alt=""
              className="h-full w-full object-cover"
              aria-hidden
            />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              {t('outfit.slots.top')}
            </p>
            <p className="truncate text-base font-semibold text-foreground">
              {t('landing.heroDemoTop')}
            </p>
          </div>
        </div>
        <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
            <img
              src={encodeURI(HERO_SLOT_IMAGES.bottom)}
              alt=""
              className="h-full w-full object-cover"
              aria-hidden
            />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              {t('outfit.slots.bottom')}
            </p>
            <p className="truncate text-base font-semibold text-foreground">
              {t('landing.heroDemoBottom')}
            </p>
          </div>
        </div>
        <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
            <img
              src={encodeURI(HERO_SLOT_IMAGES.footwear)}
              alt=""
              className="h-full w-full object-cover"
              aria-hidden
            />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              {t('outfit.slots.footwear')}
            </p>
            <p className="truncate text-base font-semibold text-foreground">
              {t('landing.heroDemoFootwear')}
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

export function HeroSection() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const isLg = useMediaQuery('(min-width: 1024px)')
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const yBlob = useTransform(scrollYProgress, [0, 1], [0, reduce || !isLg ? 0 : 120])
  const yBlob2 = useTransform(scrollYProgress, [0, 1], [0, reduce || !isLg ? 0 : 72])
  const opacityHero = useTransform(
    scrollYProgress,
    [0, 0.5],
    [1, reduce || !isLg ? 1 : 0.4]
  )

  return (
    <section
      ref={ref}
      className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-4 pb-28 pt-24 md:pb-24 md:pt-28"
    >
      <motion.div
        className="pointer-events-none absolute -left-1/4 top-0 h-[min(90vw,480px)] w-[min(90vw,480px)] rounded-full bg-gradient-to-br from-fuchsia-600/35 via-purple-600/25 to-transparent blur-3xl"
        style={{ y: yBlob }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-1/4 bottom-0 h-[min(80vw,420px)] w-[min(80vw,420px)] rounded-full bg-gradient-to-tl from-violet-600/28 via-rose-500/12 to-transparent blur-3xl"
        style={{ y: yBlob2 }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-7 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        <motion.div
          className="flex flex-col items-center text-center lg:items-start lg:text-left"
          style={{ opacity: opacityHero }}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-300/85 sm:text-xs">
            {t('landing.heroEyebrow')}
          </p>
          <h1 className="font-display mt-3 max-w-xl text-[1.65rem] font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:max-w-lg lg:text-[2.75rem] lg:leading-[1.12]">
            {t('landing.heroTitle1')}
            <span className="mt-2 block bg-gradient-to-r from-pink-300 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent">
              {t('landing.heroTitle2')}
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
            <span className="block">{t('landing.heroSub1')}</span>
            <span className="mt-1 block">{t('landing.heroSub2')}</span>
          </p>

          <div className="mt-8 hidden w-full max-w-md flex-col gap-3 lg:flex">
            <LandingCtaLink className="w-full sm:w-auto" />
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-fuchsia-300/85 transition-colors hover:text-fuchsia-200 lg:justify-start"
            >
              {t('landing.heroHowItWorks')}
            </a>
          </div>
        </motion.div>

        <div className="w-full max-w-sm self-center sm:max-w-md lg:max-w-none lg:justify-self-end">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: isLg ? 0.55 : 0.4,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.08,
            }}
          >
            <TiltCard className="w-full">
              <HeroOutfitCard />
            </TiltCard>
          </motion.div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:hidden">
          <LandingCtaLink className="w-full" />
          <a
            href="#how-it-works"
            className="inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-fuchsia-300/85 transition-colors hover:text-fuchsia-200"
          >
            {t('landing.heroHowItWorks')}
          </a>
        </div>
      </div>

      <motion.div
        className="absolute bottom-24 left-1/2 z-10 hidden -translate-x-1/2 md:bottom-8 md:block lg:bottom-8"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ delay: 1, duration: 0.5 }}
        aria-hidden
      >
        <div className="flex h-9 w-5 justify-center rounded-full border border-border pt-1.5">
          <motion.div
            className="h-1 w-1 rounded-full bg-fuchsia-400/80"
            animate={reduce ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </section>
  )
}
