import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { GlassCard } from '@/components/landing/GlassCard'
import { LANDING_PRIMARY_CTA } from '@/components/landing/landingCopy'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'
import { TiltCard } from '@/components/landing/TiltCard'
import { useMediaQuery } from '@/hooks/useMediaQuery'

function HeroOutfitCard() {
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="border-b border-white/10 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fuchsia-300/90">
          Your look · preview
        </p>
      </div>
      <div className="divide-y divide-white/10">
        <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
          <div
            className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-rose-400/45 to-fuchsia-600/35"
            aria-hidden
          />
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Top
            </p>
            <p className="truncate text-base font-semibold text-white">Merino crew</p>
          </div>
        </div>
        <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
          <div
            className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-violet-500/40 to-indigo-700/35"
            aria-hidden
          />
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Bottom
            </p>
            <p className="truncate text-base font-semibold text-white">
              Wide pleat trousers
            </p>
          </div>
        </div>
        <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
          <div
            className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-800"
            aria-hidden
          />
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Footwear
            </p>
            <p className="truncate text-base font-semibold text-white">Leather loafer</p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

export function HeroSection() {
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
            Pauua
          </p>
          <h1 className="font-display mt-3 max-w-xl text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-5xl lg:max-w-lg lg:text-[2.75rem] lg:leading-[1.12]">
            You already have great clothes.
            <span className="mt-2 block bg-gradient-to-r from-pink-300 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent">
              You just don&apos;t know what to wear.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
            <span className="block">Let your AI stylist decide in seconds.</span>
            <span className="mt-1 block">
              No more outfit stress. No more overthinking.
            </span>
          </p>

          <div className="mt-8 hidden w-full max-w-md flex-col gap-3 lg:flex">
            <LandingCtaLink className="w-full sm:w-auto">
              {LANDING_PRIMARY_CTA}
            </LandingCtaLink>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-fuchsia-300/85 transition-colors hover:text-fuchsia-200 lg:justify-start"
            >
              ↓ See how it works
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
          <LandingCtaLink className="w-full">{LANDING_PRIMARY_CTA}</LandingCtaLink>
          <a
            href="#how-it-works"
            className="inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-fuchsia-300/85 transition-colors hover:text-fuchsia-200"
          >
            ↓ See how it works
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
        <div className="flex h-9 w-5 justify-center rounded-full border border-white/20 pt-1.5">
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
