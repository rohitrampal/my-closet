import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'surface'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'btn-primary border border-transparent font-semibold shadow-soft focus-visible:outline-none disabled:pointer-events-none',
  secondary:
    'btn-secondary border border-border bg-surface text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none',
  ghost:
    'btn-ghost border border-transparent bg-transparent text-muted hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none',
  surface:
    'btn-surface border border-border bg-surface/50 text-foreground hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const layout =
    variant === 'surface'
      ? 'inline-flex min-h-11 w-full flex-col items-stretch justify-start gap-2 text-left font-normal'
      : 'inline-flex min-h-11 items-center justify-center text-center font-medium'

  return (
    <button
      type={type}
      className={`${layout} rounded-[var(--radius-button)] px-5 py-3 text-sm transition-colors ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
