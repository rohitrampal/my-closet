import type { ReactNode } from 'react'

type AppLayoutProps = {
  children: ReactNode
}

/**
 * Authenticated app content wrapper: consistent rhythm + subtle enter motion.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="animate-page-enter flex min-h-0 flex-1 flex-col gap-6 sm:gap-8">
      {children}
    </div>
  )
}
