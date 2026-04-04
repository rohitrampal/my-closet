import type { HTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

type OutfitStylingLoaderProps = HTMLAttributes<HTMLDivElement> & {
  /** Secondary line under the main message */
  hint?: string
}

export function OutfitStylingLoader({
  hint,
  className = '',
  ...props
}: OutfitStylingLoaderProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center gap-5 py-10 ${className}`.trim()}
      {...props}
    >
      <div className="outfit-styling-shimmer text-center font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
        <span className="text-lg sm:text-xl">{t('outfit.stylingYourOutfit')}</span>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="outfit-styling-dot h-2 w-2 rounded-full bg-violet-500/90 dark:bg-violet-400/90" />
        <span className="outfit-styling-dot outfit-styling-dot-delay-1 h-2 w-2 rounded-full bg-violet-500/90 dark:bg-violet-400/90" />
        <span className="outfit-styling-dot outfit-styling-dot-delay-2 h-2 w-2 rounded-full bg-violet-500/90 dark:bg-violet-400/90" />
      </div>
      {hint ? (
        <p className="max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  )
}
