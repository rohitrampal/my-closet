import { useTranslation } from 'react-i18next'

type PremiumFirstWowBannerProps = {
  className?: string
}

export function PremiumFirstWowBanner({ className = '' }: PremiumFirstWowBannerProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className={`mb-4 rounded-2xl border border-amber-400/35 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/10 to-violet-500/15 px-4 py-3 text-center shadow-sm shadow-amber-900/5 sm:px-5 sm:py-4 ${className}`.trim()}
    >
      <p className="text-sm font-semibold text-foreground sm:text-base">{t('outfit.premiumFirstWow')}</p>
    </div>
  )
}
