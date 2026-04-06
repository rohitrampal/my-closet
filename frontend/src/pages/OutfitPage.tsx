import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Heading, Subtext } from '@/components/ui/Typography'
import { DailyLimitUpgradeModal } from '@/components/wardrobe/DailyLimitUpgradeModal'
import { FirstOutfitConfetti } from '@/components/wardrobe/FirstOutfitConfetti'
import { FirstOutfitFullscreenLoader } from '@/components/wardrobe/FirstOutfitFullscreenLoader'
import { PremiumFirstWowBanner } from '@/components/wardrobe/PremiumFirstWowBanner'
import { OutfitResultExperience } from '@/components/wardrobe/OutfitResultExperience'
import { OutfitStylingLoader } from '@/components/wardrobe/OutfitStylingLoader'
import { StylistOptionsResult } from '@/components/wardrobe/StylistOptionsResult'
import { trackEvent } from '@/lib/analytics/trackEvent'
import { getApiErrorCode } from '@/lib/api/errors'
import {
  OCCASIONS,
  WEATHERS,
  STYLIST_VIBES,
  type GenerateOutfitBundle,
  type Occasion,
  type StylistOption,
  type StylistVibe,
  type Weather,
} from '@/lib/api/outfit'
import { useOutfitGenerateMutation } from '@/lib/api/queries/useOutfitGenerate'
import { useOutfitStylistMutation } from '@/lib/api/queries/useOutfitStylist'
import { useOutfitUsageQuery } from '@/lib/api/queries/useOutfitUsage'
import { markFirstAutoOutfitDone } from '@/lib/onboarding/storage'
import { hasSeenPremiumWow, markPremiumWowSeen } from '@/lib/premium/premiumWow'
import { RecentOutfitsStrip } from '@/components/wardrobe/RecentOutfitsStrip'
import { useRecentOutfitsStore } from '@/stores/useRecentOutfitsStore'
import { useAuthStore } from '@/stores/useAuthStore'

export function OutfitPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const [occasion, setOccasion] = useState<Occasion>('casual')
  const [weather, setWeather] = useState<Weather>('hot')
  const [vibe, setVibe] = useState<StylistVibe>('classy')
  const [mode, setMode] = useState<'standard' | 'stylist'>('standard')
  const [bundle, setBundle] = useState<GenerateOutfitBundle | null>(null)
  const [stylistOptions, setStylistOptions] = useState<StylistOption[] | null>(null)
  const [wardrobeEmpty, setWardrobeEmpty] = useState(false)
  const [firstOutfitCelebration, setFirstOutfitCelebration] = useState(false)
  const [showFirstAutoOverlay, setShowFirstAutoOverlay] = useState(false)
  const [confettiVisible, setConfettiVisible] = useState(false)
  const [confettiBurstKey, setConfettiBurstKey] = useState(0)
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false)
  const [showPremiumWowBanner, setShowPremiumWowBanner] = useState(false)
  const firstOutfitAutoRef = useRef(false)
  const confettiHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const generateMutation = useOutfitGenerateMutation()
  const stylistMutation = useOutfitStylistMutation()
  const { data: usage } = useOutfitUsageQuery()
  const recentOutfits = useRecentOutfitsStore((s) => s.recentOutfits)
  const addRecentOutfit = useRecentOutfitsStore((s) => s.addRecentOutfit)
  const isGenerating =
    mode === 'standard' ? generateMutation.isPending : stylistMutation.isPending

  const atDailyLimit =
    Boolean(user) &&
    !user?.is_premium &&
    usage != null &&
    usage.daily_limit != null &&
    usage.used_today >= usage.daily_limit

  const wantsFirstAutoOutfit = Boolean(
    (location.state as { runFirstOutfit?: boolean } | undefined)?.runFirstOutfit
  )

  function applyPremiumWowAfterSuccess() {
    if (user?.is_premium && !hasSeenPremiumWow()) {
      markPremiumWowSeen()
      setShowPremiumWowBanner(true)
    } else {
      setShowPremiumWowBanner(false)
    }
  }

  function openDailyLimitModal() {
    setShowDailyLimitModal(true)
  }

  useEffect(() => {
    if (!wantsFirstAutoOutfit || !user?.id) {
      firstOutfitAutoRef.current = false
      return
    }
    if (firstOutfitAutoRef.current) return
    firstOutfitAutoRef.current = true

    queueMicrotask(() => {
      navigate(location.pathname, { replace: true, state: {} })
      setMode('standard')
      setOccasion('casual')
      setWeather('hot')
      setWardrobeEmpty(false)
      setStylistOptions(null)
      setShowFirstAutoOverlay(true)

      generateMutation.mutate(
        { occasion: 'casual', weather: 'hot' },
        {
          onSuccess: (data) => {
            trackEvent('outfit_generated_success', { mode: 'standard', source: 'onboarding_auto' })
            markFirstAutoOutfitDone(user.id)
            setShowFirstAutoOverlay(false)
            setFirstOutfitCelebration(true)
            if (confettiHideRef.current) clearTimeout(confettiHideRef.current)
            setConfettiBurstKey((k) => k + 1)
            setConfettiVisible(true)
            confettiHideRef.current = setTimeout(() => {
              setConfettiVisible(false)
              confettiHideRef.current = null
            }, 1000)
            setBundle(data)
            setWardrobeEmpty(false)
            addRecentOutfit({ bundle: data, occasion: 'casual', weather: 'hot' })
            applyPremiumWowAfterSuccess()
          },
          onError: (err) => {
            setShowFirstAutoOverlay(false)
            const code = getApiErrorCode(err)
            trackEvent('outfit_generate_failed', {
              mode: 'standard',
              source: 'onboarding_auto',
              ...(code ? { code } : {}),
            })
            if (code === 'OUTFIT_INSUFFICIENT') {
              setWardrobeEmpty(true)
              return
            }
            if (code === 'OUTFIT_DAILY_LIMIT') {
              setShowDailyLimitModal(true)
            }
          },
        }
      )
    })
  }, [
    addRecentOutfit,
    generateMutation,
    location.pathname,
    navigate,
    user?.id,
    wantsFirstAutoOutfit,
  ])

  useEffect(() => {
    return () => {
      if (confettiHideRef.current) clearTimeout(confettiHideRef.current)
    }
  }, [])

  function runGenerate() {
    trackEvent('outfit_generate_clicked', { mode })
    setWardrobeEmpty(false)
    setFirstOutfitCelebration(false)
    if (mode === 'standard') {
      generateMutation.mutate(
        { occasion, weather },
        {
          onSuccess: (data) => {
            trackEvent('outfit_generated_success', { mode: 'standard' })
            setBundle(data)
            setStylistOptions(null)
            setWardrobeEmpty(false)
            setFirstOutfitCelebration(false)
            addRecentOutfit({ bundle: data, occasion, weather })
            applyPremiumWowAfterSuccess()
          },
          onError: (err) => {
            const code = getApiErrorCode(err)
            trackEvent('outfit_generate_failed', { mode: 'standard', ...(code ? { code } : {}) })
            if (code === 'OUTFIT_INSUFFICIENT') {
              setWardrobeEmpty(true)
              return
            }
            if (code === 'OUTFIT_DAILY_LIMIT') {
              openDailyLimitModal()
            }
          },
        }
      )
    } else {
      stylistMutation.mutate(
        { occasion, vibe },
        {
          onSuccess: (data) => {
            trackEvent('outfit_generated_success', { mode: 'stylist' })
            setStylistOptions(data.options)
            setBundle(null)
            setWardrobeEmpty(false)
            setFirstOutfitCelebration(false)
            applyPremiumWowAfterSuccess()
          },
          onError: (err) => {
            const code = getApiErrorCode(err)
            trackEvent('outfit_generate_failed', { mode: 'stylist', ...(code ? { code } : {}) })
            if (code === 'OUTFIT_INSUFFICIENT') {
              setWardrobeEmpty(true)
              return
            }
            if (code === 'OUTFIT_DAILY_LIMIT') {
              openDailyLimitModal()
            }
          },
        }
      )
    }
  }

  const showPreviousStandard = bundle !== null
  const showPreviousStylist = stylistOptions !== null
  const showPreviousResult =
    mode === 'standard' ? showPreviousStandard : showPreviousStylist
  const showInitialLoader = isGenerating && !showPreviousResult
  const showInlineInitialLoader = showInitialLoader && !showFirstAutoOverlay

  return (
    <div className="space-y-8">
      <DailyLimitUpgradeModal
        open={showDailyLimitModal}
        onClose={() => setShowDailyLimitModal(false)}
      />
      <FirstOutfitFullscreenLoader open={showFirstAutoOverlay} />
      <div>
        <Heading as="h1" variant="title">
          {t('outfit.title')}
        </Heading>
        <Subtext className="mt-1">{t('outfit.subtitle')}</Subtext>
        {user?.is_premium ? (
          <p className="mt-2 text-sm font-medium text-amber-900/90 dark:text-amber-100/90">
            {t('outfit.premiumUnlimited')}
          </p>
        ) : usage != null && usage.daily_limit != null ? (
          <p className="mt-2 text-sm text-muted">
            {t('outfit.generationsToday', {
              used: usage.used_today,
              limit: usage.daily_limit,
            })}
          </p>
        ) : null}
      </div>

      {atDailyLimit ? (
        <Card className="border-amber-400/30 bg-amber-500/10 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">{t('outfit.dailyLimitBanner')}</p>
          <Button
            type="button"
            className="mt-3 w-full min-h-11 sm:w-auto"
            variant="primary"
            onClick={() => {
              trackEvent('upgrade_clicked', { source: 'outfit_daily_banner' })
              navigate('/dashboard/premium')
            }}
          >
            {t('outfit.upgradeToPremium')}
          </Button>
        </Card>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            disabled={isGenerating}
            variant={mode === 'standard' ? 'primary' : 'secondary'}
            className="w-full sm:w-auto"
            onClick={() => {
              setMode('standard')
              setBundle(null)
              setStylistOptions(null)
              setWardrobeEmpty(false)
              setFirstOutfitCelebration(false)
              setShowPremiumWowBanner(false)
            }}
          >
            {t('outfit.standardMode')}
          </Button>
          <Button
            type="button"
            disabled={isGenerating}
            variant={mode === 'stylist' ? 'primary' : 'secondary'}
            className="w-full sm:w-auto"
            onClick={() => {
              setMode('stylist')
              setBundle(null)
              setStylistOptions(null)
              setWardrobeEmpty(false)
              setFirstOutfitCelebration(false)
              setShowPremiumWowBanner(false)
            }}
          >
            {t('outfit.stylistMode')}
          </Button>
        </div>

        {mode === 'stylist' && !user?.is_premium ? (
          <p className="mb-4 text-sm leading-relaxed text-muted">{t('outfit.stylistFreePreview')}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="outfit-occasion"
            label={t('outfit.occasion')}
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as Occasion)}
            disabled={isGenerating}
          >
            {OCCASIONS.map((value) => (
              <option key={value} value={value}>
                {t(`outfit.occasions.${value}`)}
              </option>
            ))}
          </Select>

          {mode === 'standard' ? (
            <Select
              id="outfit-weather"
              label={t('outfit.weather')}
              value={weather}
              onChange={(e) => setWeather(e.target.value as Weather)}
              disabled={isGenerating}
            >
              {WEATHERS.map((value) => (
                <option key={value} value={value}>
                  {t(`outfit.weathers.${value}`)}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              id="outfit-vibe"
              label={t('outfit.vibe')}
              value={vibe}
              onChange={(e) => setVibe(e.target.value as StylistVibe)}
              disabled={isGenerating}
            >
              {STYLIST_VIBES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={isGenerating || atDailyLimit}
            onClick={runGenerate}
          >
            {isGenerating
              ? t('outfit.generating')
              : mode === 'standard'
                ? t('outfit.generate')
                : t('outfit.generateStylist')}
          </Button>
          {showPreviousResult && (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={isGenerating || atDailyLimit}
              onClick={runGenerate}
            >
              {isGenerating ? t('outfit.generating') : t('outfit.tryAgain')}
            </Button>
          )}
        </div>
      </Card>

      <RecentOutfitsStrip
        entries={recentOutfits}
        onSelect={(entry) => {
          setMode('standard')
          setBundle(entry.bundle)
          setOccasion(entry.occasion)
          setWeather(entry.weather)
          setStylistOptions(null)
          setWardrobeEmpty(false)
          setFirstOutfitCelebration(false)
          setShowPremiumWowBanner(false)
        }}
      />

      {wardrobeEmpty && (
        <Card className="border-warning/35 bg-warning-soft p-5 sm:p-6">
          <p className="text-base font-medium text-foreground">
            {t('outfit.emptyUnlock')}
          </p>
          <Button
            type="button"
            className="mt-4 w-full min-h-12 touch-manipulation sm:w-auto"
            onClick={() => navigate('/dashboard/upload')}
          >
            {t('outfit.uploadClothes')}
          </Button>
        </Card>
      )}

      <section
        aria-live="polite"
        className="min-h-[120px] transition-opacity duration-300 ease-out"
      >
        {showInlineInitialLoader && (
          <Card
            padding="sm"
            className="border-dashed border-accent/35 bg-surface/40 px-2 py-1 shadow-soft"
          >
            <OutfitStylingLoader hint={t('outfit.generatingHint')} />
          </Card>
        )}

        {showPreviousResult && bundle && (
          <div className="relative transition-opacity duration-300 ease-out">
            {showPremiumWowBanner ? <PremiumFirstWowBanner /> : null}
            {confettiVisible ? <FirstOutfitConfetti burstKey={confettiBurstKey} /> : null}
            {firstOutfitCelebration && (
              <p
                className="mb-4 text-center text-base font-semibold text-foreground"
                role="status"
              >
                {t('outfit.firstOutfitHeadline')}
              </p>
            )}
            {isGenerating && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-background/85 backdrop-blur-md transition-all duration-300"
                aria-busy="true"
                aria-label={t('outfit.stylingYourOutfit')}
              >
                <OutfitStylingLoader
                  className="py-6"
                  hint={t('outfit.regeneratingStyling')}
                />
              </div>
            )}
            <motion.div
              className={`transition-[opacity,filter] duration-300 ease-out ${
                isGenerating ? 'opacity-90' : 'opacity-100'
              }`}
              initial={
                firstOutfitCelebration
                  ? { opacity: 0, scale: 0.95 }
                  : { opacity: 1, scale: 1 }
              }
              animate={{ opacity: isGenerating ? 0.9 : 1, scale: 1 }}
              transition={{
                duration: firstOutfitCelebration ? 0.55 : 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <OutfitResultExperience
                key={`${bundle.raw.top.id}-${bundle.raw.bottom?.id ?? 0}-${bundle.raw.footwear.id}`}
                occasion={occasion}
                weather={weather}
                bundle={bundle}
                showPremiumMatch={Boolean(user?.is_premium)}
              />
              {firstOutfitCelebration ? (
                <p className="mt-4 text-center text-xs leading-relaxed text-muted sm:text-sm">
                  {t('outfit.firstOutfitRetention')}
                </p>
              ) : null}
            </motion.div>
          </div>
        )}

        {showPreviousResult && stylistOptions && mode === 'stylist' && (
          <div className="relative transition-opacity duration-300 ease-out">
            {showPremiumWowBanner ? <PremiumFirstWowBanner /> : null}
            {isGenerating && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-background/85 backdrop-blur-md transition-all duration-300"
                aria-busy="true"
                aria-label={t('outfit.stylingYourOutfit')}
              >
                <OutfitStylingLoader
                  className="py-6"
                  hint={t('outfit.regeneratingStyling')}
                />
              </div>
            )}
            <div
              className={`transition-[opacity,filter] duration-300 ease-out ${
                isGenerating ? 'opacity-90' : 'opacity-100'
              }`}
            >
              <StylistOptionsResult
                options={stylistOptions}
                lockedPreviewSlots={!user?.is_premium ? 2 : 0}
              />
            </div>
          </div>
        )}

        {!isGenerating && mode === 'standard' && !bundle && !wardrobeEmpty && (
          <Card className="p-6 text-center sm:p-8">
            <p className="text-base font-medium text-foreground">
              {t('outfit.emptyUnlock')}
            </p>
            <Button
              type="button"
              className="mt-6 w-full min-h-12 touch-manipulation sm:mx-auto sm:max-w-xs"
              onClick={() => navigate('/dashboard/upload')}
            >
              {t('outfit.uploadClothes')}
            </Button>
          </Card>
        )}

        {!isGenerating && mode === 'stylist' && !stylistOptions && !wardrobeEmpty && (
          <Card className="p-6 text-center sm:p-8">
            <p className="text-base font-medium text-foreground">
              {t('outfit.emptyUnlock')}
            </p>
            <Button
              type="button"
              className="mt-6 w-full min-h-12 touch-manipulation sm:mx-auto sm:max-w-xs"
              onClick={() => navigate('/dashboard/upload')}
            >
              {t('outfit.uploadClothes')}
            </Button>
          </Card>
        )}
      </section>
    </div>
  )
}
