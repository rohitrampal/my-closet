import { useTranslation } from 'react-i18next'
import { markPremiumWelcomeSeen } from '@/lib/premium/premiumWelcome'

type PremiumWelcomeBannerProps = {
  onDismissed: () => void
}

export function PremiumWelcomeBanner({ onDismissed }: PremiumWelcomeBannerProps) {
  const { t } = useTranslation()

  function dismiss() {
    markPremiumWelcomeSeen()
    onDismissed()
  }

  return (
    <div
      role="status"
      className="border-b border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-2.5 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-medium text-foreground">{t('premium.welcomeBannerLine1')}</p>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">{t('premium.welcomeBannerLine2')}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-background/50 hover:text-foreground"
          aria-label={t('premium.welcomeBannerDismiss')}
        >
          {t('premium.welcomeBannerDismiss')}
        </button>
      </div>
    </div>
  )
}
