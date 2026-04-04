import type { HTMLAttributes, ReactNode } from 'react'

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function GlassCard({ children, className = '', ...rest }: GlassCardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
