import type { HTMLAttributes, ReactNode } from 'react'
import { Card, type CardPadding } from '@/components/ui/Card'

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  padding?: CardPadding
}

export function GlassCard({
  children,
  className = '',
  padding = 'md',
  ...rest
}: GlassCardProps) {
  return (
    <Card padding={padding} className={`shadow-glow ${className}`.trim()} {...rest}>
      {children}
    </Card>
  )
}
