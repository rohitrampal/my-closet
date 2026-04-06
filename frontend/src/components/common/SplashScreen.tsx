import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const LOGO_SRC = '/my-closet.png'

/** Full splash length (ms); reduced-motion uses a short pass-through. */
const SPLASH_DURATION_MS = 2300
const SPLASH_DURATION_REDUCED_MS = 550

const PARTICLES: {
  left: string
  top: string
  size: number
  delay: number
  drift: number
}[] = [
  { left: '10%', top: '16%', size: 3, delay: 0, drift: 6 },
  { left: '86%', top: '20%', size: 2, delay: 0.08, drift: -8 },
  { left: '22%', top: '78%', size: 2, delay: 0.12, drift: 5 },
  { left: '78%', top: '72%', size: 3, delay: 0.04, drift: -6 },
  { left: '50%', top: '10%', size: 2, delay: 0.16, drift: 4 },
  { left: '6%', top: '48%', size: 2, delay: 0.2, drift: -5 },
  { left: '92%', top: '52%', size: 2, delay: 0.06, drift: 7 },
  { left: '40%', top: '88%', size: 2, delay: 0.14, drift: -4 },
]

type SplashScreenProps = {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const finished = useRef(false)
  const [logoError, setLogoError] = useState(false)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const ms = reduce ? SPLASH_DURATION_REDUCED_MS : SPLASH_DURATION_MS
    const id = window.setTimeout(finish, ms)
    return () => window.clearTimeout(id)
  }, [finish, reduce])

  const logoEase = [0.22, 1, 0.36, 1] as const

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={t('splash.aria')}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden px-6"
      style={{ background: 'var(--color-bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0.05 : 0.45, ease: 'easeOut' }}
    >
      {!reduce && (
        <div
          className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block"
          aria-hidden
        >
          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.06, 0.18, 0.1],
                y: [0, -p.drift, 0],
              }}
              transition={{
                duration: 2.4,
                delay: p.delay,
                ease: 'easeInOut',
                repeat: 0,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex min-h-[min(52vh,320px)] w-full max-w-sm flex-col items-center justify-center">
        <motion.div
          className="pointer-events-none absolute aspect-square w-[min(72vw,280px)] rounded-full"
          style={{
            background:
              'radial-gradient(circle, var(--glow-accent-strong) 0%, var(--glow-primary-soft) 42%, transparent 72%)',
            filter: 'blur(2px)',
          }}
          initial={{ scale: 0.88, opacity: 0.45 }}
          animate={
            reduce
              ? { scale: 1, opacity: 0.55 }
              : {
                  scale: [1, 1.05, 1, 1.05, 1],
                  opacity: [0.5, 0.72, 0.52, 0.68, 0.5],
                }
          }
          transition={
            reduce
              ? { duration: 0.25 }
              : {
                  duration: 1.35,
                  times: [0, 0.25, 0.5, 0.75, 1],
                  ease: 'easeInOut',
                }
          }
        />

        <motion.div
          className="relative z-[1] flex flex-col items-center"
          animate={reduce ? undefined : { y: [0, -5, 5, -3, 0] }}
          transition={
            reduce
              ? undefined
              : {
                  duration: 2.15,
                  times: [0, 0.22, 0.52, 0.78, 1],
                  ease: 'easeInOut',
                }
          }
        >
          {!logoError ? (
            <motion.img
              src={LOGO_SRC}
              alt={t('splash.logoAlt')}
              width={200}
              height={200}
              className="h-auto w-[min(48vw,200px)] object-contain select-none"
              decoding="async"
              initial={
                reduce
                  ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                  : { opacity: 0, scale: 0.8, filter: 'blur(10px)' }
              }
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={reduce ? { duration: 0.1 } : { duration: 0.8, ease: logoEase }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <motion.div
              className="font-display text-3xl font-bold tracking-[0.2em] text-gradient sm:text-4xl"
              initial={reduce ? false : { opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={reduce ? { duration: 0.1 } : { duration: 0.8, ease: logoEase }}
              aria-hidden
            >
              MC
            </motion.div>
          )}
        </motion.div>
      </div>

      <motion.p
        className="mt-10 max-w-xs text-center text-sm font-medium tracking-wide text-muted"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduce ? { duration: 0.15 } : { delay: 1.35, duration: 0.5, ease: 'easeOut' }
        }
      >
        {t('splash.loading')}
      </motion.p>
    </motion.div>
  )
}
