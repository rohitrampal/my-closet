import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

const COUNT = 14

function buildPieces(seed: number) {
  return Array.from({ length: COUNT }, (_, i) => {
    const n = (seed + i * 17) % 1000
    return {
      id: i,
      left: `${10 + (n % 80)}%`,
      delay: (i % 7) * 0.045,
      duration: 0.82 + (n % 5) * 0.06,
      rotateEnd: -40 + (n % 80),
      size: 5 + (n % 4),
      useAccent: i % 3 === 0,
    }
  })
}

type FirstOutfitConfettiProps = {
  /** Bump to regenerate random-ish layout per celebration */
  burstKey?: number
}

/**
 * Low-intensity confetti (~1s). Renders nothing when reduced motion is preferred.
 */
export function FirstOutfitConfetti({ burstKey = 0 }: FirstOutfitConfettiProps) {
  const reduce = useReducedMotion()
  const pieces = useMemo(() => buildPieces(burstKey), [burstKey])

  if (reduce) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[10040] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <motion.span
          key={`${p.id}-${burstKey}`}
          className="absolute top-0 rounded-[1px]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.6,
            background: p.useAccent ? 'var(--color-accent)' : 'var(--color-primary)',
            opacity: 0.85,
            boxShadow:
              '0 0 10px color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}
          initial={{ y: '-8%', rotate: 0, opacity: 0.95 }}
          animate={{
            y: '110vh',
            rotate: p.rotateEnd,
            opacity: [0.95, 0.9, 0.35, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}
    </div>
  )
}
