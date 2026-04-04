import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'article'
}

export function Reveal({ children, className = '', delay = 0, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const duration = reduce ? 0 : isMobile ? 0.4 : 0.58
  const yOffset = isMobile ? 20 : 28

  if (reduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  const MotionTag =
    as === 'section' ? motion.section : as === 'article' ? motion.article : motion.div
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px 0px' }}
      transition={{ duration, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </MotionTag>
  )
}
