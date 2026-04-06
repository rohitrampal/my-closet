import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'gradient' | 'light' | 'ghost'

type LandingCtaLinkProps = Omit<LinkProps, 'to' | 'children'> & {
  to?: string
  variant?: Variant
  children?: React.ReactNode
}

const variantClass: Record<Variant, string> = {
  gradient: 'btn-primary border border-transparent font-semibold text-white shadow-soft',
  light:
    'btn-secondary border border-border bg-surface-light text-foreground shadow-soft hover:border-primary/25',
  ghost:
    'btn-ghost border border-border bg-surface/40 text-foreground hover:border-primary/30 hover:bg-surface hover:shadow-soft',
}

export function LandingCtaLink({
  to = '/signup',
  variant = 'gradient',
  className = '',
  children,
  ...rest
}: LandingCtaLinkProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const fullWidth = /\bw-full\b/.test(className)
  const gradientMotion = variant === 'gradient'

  return (
    <motion.span
      className={
        fullWidth
          ? 'flex w-full max-w-full justify-stretch'
          : 'inline-flex max-w-full justify-center'
      }
      whileTap={reduce || gradientMotion ? undefined : { scale: 0.97 }}
      whileHover={reduce || gradientMotion ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 520, damping: 28 }}
    >
      <Link
        to={to}
        className={`inline-flex min-h-12 min-w-11 items-center justify-center rounded-[var(--radius-button)] px-5 py-3 text-center text-sm font-semibold leading-snug sm:min-h-[3.25rem] sm:px-7 sm:py-3.5 sm:text-base ${variantClass[variant]} ${className}`}
        {...rest}
      >
        {children ?? t('landing.primaryCta')}
      </Link>
    </motion.span>
  )
}
