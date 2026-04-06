import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/landing/GlassCard'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const DEMO_KEYS = ['o1', 'o2', 'o3'] as const

const GRADIENTS = [
  'from-violet-500/40 via-fuchsia-500/30 to-rose-400/25',
  'from-indigo-500/35 via-purple-500/25 to-pink-400/20',
  'from-rose-400/35 via-fuchsia-500/25 to-violet-600/20',
] as const

const PIECE_SUFFIXES = ['piece1', 'piece2', 'piece3'] as const

export function DemoSection() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const isLg = useMediaQuery('(min-width: 1024px)')
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [reduce || !isLg ? 0 : 28, reduce || !isLg ? 0 : -28]
  )

  return (
    <section ref={ref} className="relative overflow-hidden px-4 py-12 md:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-300/80">
            {t('landing.demo.eyebrow')}
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('landing.demo.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            <span className="block">{t('landing.demo.sub1')}</span>
            <span className="mt-1 block">{t('landing.demo.sub2')}</span>
          </p>
        </Reveal>

        <motion.div
          className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 md:mt-10 lg:grid-cols-3 lg:gap-5"
          style={{ y }}
        >
          {DEMO_KEYS.map((key, i) => {
            const name = t(`landing.demo.${key}.name`)
            return (
              <Reveal key={key} delay={i * 0.05} className="h-full">
                <TiltCard className="h-full">
                  <GlassCard padding="none" className="group flex h-full flex-col overflow-hidden">
                    <div
                      className={`relative h-44 bg-gradient-to-br ${GRADIENTS[i]} sm:h-48`}
                      role="img"
                      aria-label={t('landing.demo.outfitMoodAria', { name })}
                    >
                      <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/90 backdrop-blur-md">
                        {t(`landing.demo.${key}.tag`)}
                      </span>
                      <motion.div
                        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      >
                        {!reduce && (
                          <motion.div
                            className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl"
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-lg font-semibold text-foreground">{name}</h3>
                      <ul className="mt-3 space-y-1.5 text-sm text-muted">
                        {PIECE_SUFFIXES.map((suffix) => (
                          <li key={suffix} className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-fuchsia-400/70" />
                            {t(`landing.demo.${key}.${suffix}`)}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-xs text-muted">{t('landing.demo.fromPieces')}</p>
                    </div>
                  </GlassCard>
                </TiltCard>
              </Reveal>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
