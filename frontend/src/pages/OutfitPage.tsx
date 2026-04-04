import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { OutfitResultExperience } from '@/components/wardrobe/OutfitResultExperience'
import { OutfitStylingLoader } from '@/components/wardrobe/OutfitStylingLoader'
import { StylistOptionsResult } from '@/components/wardrobe/StylistOptionsResult'
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
import { RecentOutfitsStrip } from '@/components/wardrobe/RecentOutfitsStrip'
import { useRecentOutfitsStore } from '@/stores/useRecentOutfitsStore'

export function OutfitPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [occasion, setOccasion] = useState<Occasion>('casual')
  const [weather, setWeather] = useState<Weather>('hot')
  const [vibe, setVibe] = useState<StylistVibe>('classy')
  const [mode, setMode] = useState<'standard' | 'stylist'>('standard')
  const [bundle, setBundle] = useState<GenerateOutfitBundle | null>(null)
  const [stylistOptions, setStylistOptions] = useState<StylistOption[] | null>(null)
  const [wardrobeEmpty, setWardrobeEmpty] = useState(false)

  const generateMutation = useOutfitGenerateMutation()
  const stylistMutation = useOutfitStylistMutation()
  const recentOutfits = useRecentOutfitsStore((s) => s.recentOutfits)
  const addRecentOutfit = useRecentOutfitsStore((s) => s.addRecentOutfit)
  const isGenerating =
    mode === 'standard' ? generateMutation.isPending : stylistMutation.isPending

  function runGenerate() {
    setWardrobeEmpty(false)
    if (mode === 'standard') {
      generateMutation.mutate(
        { occasion, weather },
        {
          onSuccess: (data) => {
            setBundle(data)
            setStylistOptions(null)
            setWardrobeEmpty(false)
            addRecentOutfit({ bundle: data, occasion, weather })
          },
          onError: (err) => {
            if (getApiErrorCode(err) === 'OUTFIT_INSUFFICIENT') {
              setWardrobeEmpty(true)
            }
          },
        }
      )
    } else {
      stylistMutation.mutate(
        { occasion, vibe },
        {
          onSuccess: (data) => {
            setStylistOptions(data.options)
            setBundle(null)
            setWardrobeEmpty(false)
          },
          onError: (err) => {
            if (getApiErrorCode(err) === 'OUTFIT_INSUFFICIENT') {
              setWardrobeEmpty(true)
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('outfit.title')}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t('outfit.subtitle')}
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            disabled={isGenerating}
            variant={mode === 'standard' ? 'primary' : 'secondary'}
            onClick={() => {
              setMode('standard')
              setBundle(null)
              setStylistOptions(null)
              setWardrobeEmpty(false)
            }}
          >
            {t('outfit.standardMode')}
          </Button>
          <Button
            type="button"
            disabled={isGenerating}
            variant={mode === 'stylist' ? 'primary' : 'secondary'}
            onClick={() => {
              setMode('stylist')
              setBundle(null)
              setStylistOptions(null)
              setWardrobeEmpty(false)
            }}
          >
            {t('outfit.stylistMode')}
          </Button>
        </div>

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
            disabled={isGenerating}
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
              disabled={isGenerating}
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
        }}
      />

      {wardrobeEmpty && (
        <Card className="border-amber-200/80 bg-amber-50/60 p-5 transition-all duration-300 dark:border-amber-900/50 dark:bg-amber-950/25 sm:p-6">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {t('outfit.emptyWardrobe')}
          </p>
          <Button
            type="button"
            className="mt-4 w-full sm:w-auto"
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
        {showInitialLoader && (
          <div className="rounded-(--radius-app) border border-dashed border-violet-200/80 bg-gradient-to-b from-violet-50/40 to-transparent px-4 py-2 dark:border-violet-900/40 dark:from-violet-950/20">
            <OutfitStylingLoader hint={t('outfit.generatingHint')} />
          </div>
        )}

        {showPreviousResult && bundle && (
          <div className="relative transition-opacity duration-300 ease-out">
            {isGenerating && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-md transition-all duration-300 dark:bg-zinc-950/85"
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
              <OutfitResultExperience
                key={`${bundle.raw.top.id}-${bundle.raw.bottom?.id ?? 0}-${bundle.raw.footwear.id}`}
                occasion={occasion}
                weather={weather}
                bundle={bundle}
              />
            </div>
          </div>
        )}

        {showPreviousResult && stylistOptions && mode === 'stylist' && (
          <div className="relative transition-opacity duration-300 ease-out">
            {isGenerating && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-md transition-all duration-300 dark:bg-zinc-950/85"
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
              <StylistOptionsResult options={stylistOptions} />
            </div>
          </div>
        )}

        {!isGenerating && mode === 'standard' && !bundle && !wardrobeEmpty && (
          <Card className="border-zinc-200/80 bg-white/90 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('outfit.emptyStateTitle')}
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
              <li>{t('outfit.emptySuggestion1')}</li>
              <li>{t('outfit.emptySuggestion2')}</li>
              <li>{t('outfit.emptySuggestion3')}</li>
            </ul>
          </Card>
        )}

        {!isGenerating && mode === 'stylist' && !stylistOptions && !wardrobeEmpty && (
          <Card className="border-zinc-200/80 bg-white/90 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('outfit.emptyStateTitle')}
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
              <li>{t('outfit.emptySuggestion1')}</li>
              <li>{t('outfit.emptySuggestion2')}</li>
              <li>{t('outfit.emptySuggestion3')}</li>
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}
