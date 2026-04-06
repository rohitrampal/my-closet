import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '@/lib/analytics/trackEvent'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Heading } from '@/components/ui/Typography'

type DailyLimitUpgradeModalProps = {
  open: boolean
  onClose: () => void
}

export function DailyLimitUpgradeModal({ open, onClose }: DailyLimitUpgradeModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    queueMicrotask(() => document.getElementById('daily-limit-upgrade-primary')?.focus())
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md"
      >
        <Card className="border-amber-400/25 bg-surface/95 p-6 shadow-lg shadow-amber-900/10 sm:p-8">
          <Heading as="h2" id={titleId} variant="title" className="!text-xl sm:!text-2xl">
            {t('outfit.dailyLimitModalTitle')}
          </Heading>
          <p id={descId} className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            {t('outfit.dailyLimitModalSubtitle')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              id="daily-limit-upgrade-primary"
              type="button"
              variant="primary"
              className="w-full min-h-12 sm:flex-1"
              onClick={() => {
                trackEvent('upgrade_clicked', { source: 'daily_limit_modal' })
                onClose()
                navigate('/dashboard/premium')
              }}
            >
              {t('outfit.dailyLimitModalUpgrade')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full min-h-12 sm:flex-1"
              onClick={onClose}
            >
              {t('outfit.dailyLimitModalTomorrow')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
