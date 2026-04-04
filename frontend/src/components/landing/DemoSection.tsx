import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { GlassCard } from '@/components/landing/GlassCard'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const outfits = [
  {
    name: 'Gallery opening',
    tag: 'Evening',
    gradient: 'from-violet-500/40 via-fuchsia-500/30 to-rose-400/25',
    pieces: ['Drape blazer', 'Silk slip', 'Strappy heel'],
  },
  {
    name: 'Monday focus',
    tag: 'Work',
    gradient: 'from-indigo-500/35 via-purple-500/25 to-pink-400/20',
    pieces: ['Tailored trousers', 'Fine knit', 'Loafer'],
  },
  {
    name: 'Sunday slow',
    tag: 'Casual',
    gradient: 'from-rose-400/35 via-fuchsia-500/25 to-violet-600/20',
    pieces: ['Oversized coat', 'Wide denim', 'Trainer'],
  },
]

export function DemoSection() {
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
            Live preview
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            See what your wardrobe can actually do
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
            <span className="block">
              These outfits are generated from your own clothes.
            </span>
            <span className="mt-1 block">Nothing new. Just smarter combinations.</span>
          </p>
        </Reveal>

        <motion.div
          className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 md:mt-10 lg:grid-cols-3 lg:gap-5"
          style={{ y }}
        >
          {outfits.map((outfit, i) => (
            <Reveal key={outfit.name} delay={i * 0.05} className="h-full">
              <TiltCard className="h-full">
                <GlassCard className="group flex h-full flex-col overflow-hidden p-0">
                  <div
                    className={`relative h-44 bg-gradient-to-br ${outfit.gradient} sm:h-48`}
                    role="img"
                    aria-label={`${outfit.name} outfit mood`}
                  >
                    <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
                      {outfit.tag}
                    </span>
                    <motion.div
                      className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    >
                      {!reduce && (
                        <motion.div
                          className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-semibold text-white">
                      {outfit.name}
                    </h3>
                    <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
                      {outfit.pieces.map((p) => (
                        <li key={p} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-fuchsia-400/70" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs text-zinc-500">
                      From pieces you already own
                    </p>
                  </div>
                </GlassCard>
              </TiltCard>
            </Reveal>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
