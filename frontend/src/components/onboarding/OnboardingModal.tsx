import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Heading } from '@/components/ui/Typography'
import { dismissOnboarding } from '@/lib/onboarding/storage'

type OnboardingModalProps = {
  open: boolean
  userId: number
  /** Optional; dismiss is persisted in storage — parent may omit if `open` is derived. */
  onClose?: () => void
}

export function OnboardingModal({ open, userId, onClose }: OnboardingModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    queueMicrotask(() => document.getElementById('onboarding-cta')?.focus())
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  function handleStart() {
    dismissOnboarding(userId)
    onClose?.()
    navigate('/dashboard/upload')
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm"
      >
        <Card className="p-6 shadow-soft sm:p-8">
          <Heading as="h2" id={titleId} variant="title" className="!text-xl sm:!text-2xl">
            {t('onboarding.welcomeTitle')}
          </Heading>
          <ol className="mt-5 space-y-3 text-sm text-muted">
            <li className="flex gap-2">
              <span className="font-semibold text-primary">1.</span>
              <span>{t('onboarding.step1')}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">2.</span>
              <span>{t('onboarding.step2')}</span>
            </li>
          </ol>
          <Button
            id="onboarding-cta"
            type="button"
            className="mt-8 w-full min-h-12 touch-manipulation text-base"
            onClick={handleStart}
          >
            {t('onboarding.cta')}
          </Button>
        </Card>
      </div>
    </div>
  )
}
