import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import { type ReactNode, useCallback, useRef } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type TiltCardProps = {
  children: ReactNode
  className?: string
}

export function TiltCard({ children, className = '' }: TiltCardProps) {
  const reduce = useReducedMotion()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const ref = useRef<HTMLDivElement>(null)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const smoothX = useSpring(mx, { stiffness: 280, damping: 32 })
  const smoothY = useSpring(my, { stiffness: 280, damping: 32 })
  const rotateX = useTransform(smoothY, [-1, 1], [5, -5])
  const rotateY = useTransform(smoothX, [-1, 1], [-5, 5])

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current || !isDesktop || reduce) return
      const r = ref.current.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 2 - 1
      const y = ((e.clientY - r.top) / r.height) * 2 - 1
      mx.set(Math.max(-1, Math.min(1, x)))
      my.set(Math.max(-1, Math.min(1, y)))
    },
    [isDesktop, reduce, mx, my]
  )

  const onLeave = useCallback(() => {
    mx.set(0)
    my.set(0)
  }, [mx, my])

  if (!isDesktop || reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={`[perspective:900px] ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div
        className="h-full [transform-style:preserve-3d]"
        style={{ rotateX, rotateY }}
      >
        {children}
      </motion.div>
    </div>
  )
}
