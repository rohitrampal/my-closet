import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 focus-visible:ring-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white',
  secondary:
    'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50 focus-visible:ring-zinc-400 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 dark:hover:bg-zinc-800',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-zinc-100 focus-visible:ring-zinc-400 dark:text-zinc-200 dark:hover:bg-zinc-900',
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
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-app)] px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950 ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
