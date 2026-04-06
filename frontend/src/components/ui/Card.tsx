import type { HTMLAttributes, ReactNode } from 'react'

export type CardPadding = 'none' | 'sm' | 'md' | 'default'

export type CardRadius = 'card' | 'button'

type CardTag = 'div' | 'article' | 'section'

export type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  /** Lift + glow on hover (pointer devices only; see index.css) */
  interactive?: boolean
  padding?: CardPadding
  /** `card` = 16px, `button` = 12px (auth forms) */
  radius?: CardRadius
  as?: CardTag
}

const paddingClass: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  default: 'p-4 sm:p-5',
}

const radiusClass: Record<CardRadius, string> = {
  card: 'rounded-[var(--radius-card)]',
  button: 'rounded-[var(--radius-button)]',
}

export function Card({
  as: Comp = 'div',
  children,
  className = '',
  interactive = false,
  padding = 'default',
  radius = 'card',
  ...props
}: CardProps) {
  return (
    <Comp
      className={`card-glass ${radiusClass[radius]} ${interactive ? 'card-glass-interactive' : ''} ${paddingClass[padding]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Comp>
  )
}
