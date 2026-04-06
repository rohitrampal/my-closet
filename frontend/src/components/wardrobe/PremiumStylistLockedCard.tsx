import { trackEvent } from '@/lib/analytics/trackEvent'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type PremiumStylistLockedCardProps = {
  /** e.g. "Trendy" — shown blurred behind overlay */
  labelHint: string
}

export function PremiumStylistLockedCard({ labelHint }: PremiumStylistLockedCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Card className="relative flex min-h-[280px] flex-col overflow-hidden border border-accent/25 bg-surface/60 p-0">
      <div
        className="pointer-events-none select-none px-4 py-3 blur-sm opacity-40"
        aria-hidden
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{labelHint}</p>
        <div className="mt-3 h-24 rounded-lg bg-gradient-to-br from-violet-200/40 to-fuchsia-200/30 dark:from-violet-900/40 dark:to-fuchsia-900/30" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 rounded bg-border" />
          <div className="h-3 w-1/2 rounded bg-border" />
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 px-4 py-6 backdrop-blur-md">
        <p className="text-center text-sm font-semibold text-foreground">
          {t('outfit.premiumLockedTitle')}
        </p>
        <p className="text-center text-xs leading-relaxed text-muted">
          {t('outfit.premiumLockedSubtitle')}
        </p>
        <Button
          type="button"
          variant="primary"
          className="w-full max-w-[220px]"
          onClick={() => {
            trackEvent('upgrade_clicked', { source: 'stylist_locked_card' })
            navigate('/dashboard/premium')
          }}
        >
          {t('outfit.upgradeToPremium')}
        </Button>
      </div>
    </Card>
  )
}
