import type { HTMLAttributes } from 'react'

import { i18n } from '@/lib/i18n/config'

export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  label?: string
}

export function Loader({ label, className = '', ...props }: LoaderProps) {
  const resolved = label ?? i18n.t('common.loading')
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`.trim()}
      {...props}
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary"
        aria-hidden
      />
      <span className="sr-only">{resolved}</span>
    </div>
  )
}
