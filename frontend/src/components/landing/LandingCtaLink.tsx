import { motion, useReducedMotion } from 'framer-motion'
import { Link, type LinkProps } from 'react-router-dom'
import { LANDING_PRIMARY_CTA } from '@/components/landing/landingCopy'

type Variant = 'gradient' | 'light' | 'ghost'

type LandingCtaLinkProps = Omit<LinkProps, 'to' | 'children'> & {
  to?: string
  variant?: Variant
  children?: React.ReactNode
}

const variantClass: Record<Variant, string> = {
  gradient:
    'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-950/45 hover:shadow-[0_0_28px_rgba(192,38,211,0.45)] hover:shadow-fuchsia-500/30',
  light:
    'bg-white text-zinc-950 shadow-xl hover:shadow-[0_0_28px_rgba(255,255,255,0.35)]',
  ghost:
    'border border-white/20 bg-white/5 text-white hover:border-white/35 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]',
}

export function LandingCtaLink({
  to = '/signup',
  variant = 'gradient',
  className = '',
  children = LANDING_PRIMARY_CTA,
  ...rest
}: LandingCtaLinkProps) {
  const reduce = useReducedMotion()
  const fullWidth = /\bw-full\b/.test(className)

  return (
    <motion.span
      className={
        fullWidth
          ? 'flex w-full max-w-full justify-stretch'
          : 'inline-flex max-w-full justify-center'
      }
      whileTap={reduce ? undefined : { scale: 0.98 }}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 520, damping: 28 }}
    >
      <Link
        to={to}
        className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3.5 text-center text-sm font-semibold leading-snug transition-shadow duration-200 sm:min-h-[3.25rem] sm:px-7 sm:text-base ${variantClass[variant]} ${className}`}
        {...rest}
      >
        {children}
      </Link>
    </motion.span>
  )
}
