import type { HTMLAttributes } from 'react'

export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  label?: string
}

export function Loader({ label = 'Loading', className = '', ...props }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`.trim()}
      {...props}
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200"
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
