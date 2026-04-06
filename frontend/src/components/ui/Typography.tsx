import type { HTMLAttributes, ReactNode } from 'react'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: HeadingTag
  children: ReactNode
  /** display: hero; title: page; section: blocks */
  variant?: 'display' | 'title' | 'section'
}

const headingSize: Record<NonNullable<HeadingProps['variant']>, string> = {
  display:
    'font-display text-3xl font-bold tracking-tight typography-heading-strong sm:text-4xl md:text-5xl',
  title: 'text-2xl font-semibold tracking-tight typography-heading sm:font-bold',
  section: 'text-base font-semibold tracking-tight typography-heading sm:text-lg',
}

export function Heading({
  as: Tag = 'h2',
  variant = 'section',
  className = '',
  children,
  ...props
}: HeadingProps) {
  return (
    <Tag className={`${headingSize[variant]} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  )
}

export type SubtextProps = HTMLAttributes<HTMLParagraphElement> & {
  as?: 'p' | 'span'
  children: ReactNode
}

export function Subtext({
  as: Tag = 'p',
  className = '',
  children,
  ...props
}: SubtextProps) {
  return (
    <Tag
      className={`typography-subtext text-sm leading-relaxed ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  )
}

export type GradientTextProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
}

export function GradientText({ className = '', children, ...props }: GradientTextProps) {
  return (
    <span className={`text-gradient ${className}`.trim()} {...props}>
      {children}
    </span>
  )
}
