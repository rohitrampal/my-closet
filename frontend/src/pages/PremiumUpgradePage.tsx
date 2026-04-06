import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Heading, Subtext } from '@/components/ui/Typography'
import { trackEvent } from '@/lib/analytics/trackEvent'
import { getErrorMessage } from '@/lib/api/errors'
import { usePaymentConfig } from '@/lib/api/queries/usePaymentConfig'
import {
  isRazorpayUserClosed,
  startPremiumCheckout,
} from '@/lib/payment/startPremiumCheckout'
import { useAuthStore } from '@/stores/useAuthStore'

function CompareCard({
  title,
  points,
  highlight,
}: {
  title: string
  points: string[]
  highlight?: boolean
}) {
  return (
    <Card
      className={`flex flex-col p-5 sm:p-6 ${
        highlight
          ? 'relative border-2 border-fuchsia-500/45 bg-gradient-to-b from-fuchsia-500/10 via-surface to-violet-500/5 shadow-lg shadow-fuchsia-900/15 ring-1 ring-amber-400/20'
          : 'border border-border bg-surface/80'
      }`.trim()}
    >
      {highlight ? (
        <div
          className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-40 blur-xl"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(217, 70, 239, 0.25), transparent 70%)',
          }}
        />
      ) : null}
      <h2 className="relative text-base font-bold text-foreground sm:text-lg">{title}</h2>
      <ul className="relative mt-4 space-y-2.5 text-sm text-muted">
        {points.map((line, i) => (
          <li key={i} className="flex gap-2 leading-relaxed">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60"
              aria-hidden
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function PremiumUpgradePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isPremium = user?.is_premium
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const {
    data: pricing,
    isPending: pricingPending,
    isError: pricingError,
  } = usePaymentConfig()

  const priceLine = pricingError
    ? t('premium.priceUnavailable')
    : pricingPending || !pricing
      ? t('premium.priceLoading')
      : t('premium.priceMonthly', { price: pricing.price })

  const freePoints = [
    t('premium.compare.freePoint1'),
    t('premium.compare.freePoint2'),
    t('premium.compare.freePoint3'),
  ]
  const premiumPoints = [
    t('premium.compare.premiumPoint1'),
    t('premium.compare.premiumPoint2'),
    t('premium.compare.premiumPoint3'),
  ]

  const handleUnlock = async () => {
    trackEvent('upgrade_clicked', { source: 'premium_page' })
    setCheckoutBusy(true)
    try {
      await startPremiumCheckout(user?.email)
      trackEvent('payment_success')
      toast.success(t('toasts.premiumPaymentSuccess'))
      navigate('/dashboard')
    } catch (e: unknown) {
      if (isRazorpayUserClosed(e)) {
        return
      }
      trackEvent('payment_failed', {
        reason:
          e instanceof Error
            ? e.message === 'MISSING_RAZORPAY_KEY'
              ? 'config'
              : e.message === 'RAZORPAY_SCRIPT_MISSING'
                ? 'script'
                : 'other'
            : 'unknown',
      })
      if (e instanceof Error) {
        if (e.message === 'MISSING_RAZORPAY_KEY') {
          toast.error(t('toasts.premiumPaymentsDisabled'))
          return
        }
        if (e.message === 'RAZORPAY_SCRIPT_MISSING') {
          toast.error(t('toasts.premiumCheckoutLoadFailed'))
          return
        }
      }
      toast.error(getErrorMessage(e, t) || t('toasts.premiumPaymentFailed'))
    } finally {
      setCheckoutBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center sm:text-left">
        <Heading as="h1" variant="title">
          {t('premium.title')}
        </Heading>
        <Subtext className="mt-1">{t('premium.subtitle')}</Subtext>
        <p className="mx-auto mt-3 max-w-md text-xs text-muted sm:mx-0 sm:text-sm">
          {t('premium.socialProof')}
        </p>
      </div>

      <section aria-labelledby="premium-compare-heading">
        <h2
          id="premium-compare-heading"
          className="text-center text-lg font-semibold tracking-tight text-foreground sm:text-xl"
        >
          {t('premium.compare.title')}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <CompareCard title={t('premium.compare.freeLabel')} points={freePoints} />
          <CompareCard
            title={t('premium.compare.premiumLabel')}
            points={premiumPoints}
            highlight
          />
        </div>
      </section>

      <Card className="space-y-4 p-6">
        <ul className="list-inside list-disc space-y-2 text-sm text-foreground">
          <li>{t('premium.perk1')}</li>
          <li>{t('premium.perk2')}</li>
          <li>{t('premium.perk3')}</li>
        </ul>
        {isPremium ? (
          <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-900 dark:text-emerald-100">
            {t('premium.alreadyActive')}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            {t('premium.howToUpgrade')}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {!isPremium ? (
            <div className="flex flex-col items-stretch gap-1 sm:items-start">
              <p className="text-center text-xs text-muted sm:text-left">
                {t('premium.upgradeLegalPrefix')}
                <Link
                  to="/terms"
                  className="font-medium text-primary underline-offset-4 hover:text-primary-soft hover:underline"
                >
                  {t('legal.terms')}
                </Link>
                {/* {t('premium.upgradeLegalAnd')}
                <Link
                  to="/refunds"
                  className="font-medium text-primary underline-offset-4 hover:text-primary-soft hover:underline"
                >
                  {t('legal.refunds')}
                </Link> */}
                {t('premium.upgradeLegalSuffix')}
              </p>
              <Button
                type="button"
                variant="primary"
                className="w-full sm:w-auto"
                disabled={checkoutBusy}
                onClick={() => void handleUnlock()}
              >
                {t('premium.unlockCta')}
              </Button>
              <span className="text-center text-sm font-medium text-muted sm:text-left">
                {priceLine}
              </span>
            </div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => navigate('/outfit')}
          >
            {t('premium.backToOutfits')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
