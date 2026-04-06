import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OutfitPieceCard } from '@/components/wardrobe/OutfitPieceCard'
import { OutfitSharePoster } from '@/components/wardrobe/OutfitSharePoster'
import { useOutfitFeedbackMutation } from '@/lib/api/queries/useOutfitFeedback'
import { useSaveOutfitMutation } from '@/lib/api/queries/useSavedOutfits'
import {
  captureOutfitShareNode,
  downloadOutfitShareBlob,
  shareOutfitBlob,
} from '@/lib/outfit/shareOutfitImage'
import { API_BASE_URL } from '@/lib/api/client'
import {
  matchConfidenceFromReasons,
  type GenerateOutfitBundle,
  type Occasion,
  type Weather,
} from '@/lib/api/outfit'

type OutfitResultExperienceProps = {
  occasion: Occasion
  weather: Weather
  bundle: GenerateOutfitBundle
  showPremiumMatch?: boolean
}

export function OutfitResultExperience({
  occasion,
  weather,
  bundle,
  showPremiumMatch = false,
}: OutfitResultExperienceProps) {
  const { t } = useTranslation()
  const { outfit, raw, reasons } = bundle

  const shareFetchImageSrc = useMemo(
    () => ({
      top: `${API_BASE_URL}/clothes/${raw.top.id}/share-image`,
      bottom: raw.bottom
        ? `${API_BASE_URL}/clothes/${raw.bottom.id}/share-image`
        : undefined,
      footwear: `${API_BASE_URL}/clothes/${raw.footwear.id}/share-image`,
    }),
    [raw.top.id, raw.bottom?.id, raw.footwear.id]
  )
  const [feedbackChoice, setFeedbackChoice] = useState<'like' | 'dislike' | null>(null)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)
  const matchPercent = matchConfidenceFromReasons(reasons)

  const feedbackMutation = useOutfitFeedbackMutation()
  const saveOutfitMutation = useSaveOutfitMutation()
  const pendingVars = feedbackMutation.variables
  const sendingLike = feedbackMutation.isPending && pendingVars?.liked === true
  const sendingDislike = feedbackMutation.isPending && pendingVars?.liked === false

  const rationaleLines = useMemo(() => {
    const occ = t(`outfit.occasions.${occasion}`)
    const wea = t(`outfit.weathers.${weather}`)
    const lines: string[] = [
      t('outfit.rationale.lead', { occasion: occ, weather: wea }),
      t('outfit.rationale.top', {
        typeLabel: t(`clothes.types.${outfit.top.type}`),
        color: outfit.top.color,
        style: outfit.top.style,
      }),
    ]
    if (outfit.bottom) {
      lines.push(
        t('outfit.rationale.bottom', {
          color: outfit.bottom.color,
          style: outfit.bottom.style,
        })
      )
    } else {
      lines.push(t('outfit.rationale.dressFlow'))
    }
    lines.push(
      t('outfit.rationale.footwear', {
        color: outfit.footwear.color,
        style: outfit.footwear.style,
      })
    )
    lines.push(t('outfit.rationale.balance'))
    return lines
  }, [t, occasion, weather, outfit])

  const appName = t('app.name')
  const posterCopy = useMemo(
    () => ({
      appName,
      posterTitle: t('outfit.sharePosterTitle'),
      contextLine: `${t(`outfit.occasions.${occasion}`)} · ${t(`outfit.weathers.${weather}`)}`,
      pickBadge: t('outfit.pickLabels.minimal'),
      matchLine: t('outfit.matchConfidence', { percent: matchPercent }),
      topTitle:
        outfit.top.type === 'dress' ? t('outfit.slots.topDress') : t('outfit.slots.top'),
      bottomTitle: t('outfit.slots.bottom'),
      footwearTitle: t('outfit.slots.footwear'),
      dressNote: t('outfit.dressReplacesBottom'),
      topCaption: `${t(`clothes.types.${outfit.top.type}`)} · ${outfit.top.color} · ${outfit.top.style}`,
      bottomCaption: outfit.bottom
        ? `${t(`clothes.types.${outfit.bottom.type}`)} · ${outfit.bottom.color} · ${outfit.bottom.style}`
        : undefined,
      footwearCaption: `${t(`clothes.types.${outfit.footwear.type}`)} · ${outfit.footwear.color} · ${outfit.footwear.style}`,
      footerLine: t('outfit.sharePosterFooter', { app: appName }),
    }),
    [t, appName, occasion, weather, outfit, matchPercent]
  )

  const feedbackLocked = feedbackChoice !== null || feedbackMutation.isPending

  async function exportPosterBlob(): Promise<Blob | null> {
    const el = posterRef.current
    if (!el) return null
    return captureOutfitShareNode(el)
  }

  async function handleDownloadOutfitImage() {
    setShareBusy(true)
    try {
      const blob = await exportPosterBlob()
      if (!blob) {
        toast.error(t('outfit.shareFailed'))
        return
      }
      downloadOutfitShareBlob(blob)
    } catch {
      toast.error(t('outfit.shareFailed'))
    } finally {
      setShareBusy(false)
    }
  }

  async function handleShareOutfit() {
    setShareBusy(true)
    try {
      const blob = await exportPosterBlob()
      if (!blob) {
        toast.error(t('outfit.shareFailed'))
        return
      }
      const outcome = await shareOutfitBlob(blob, {
        title: t('outfit.shareOutfit'),
        text: posterCopy.contextLine,
      })
      if (outcome === 'unsupported') {
        downloadOutfitShareBlob(blob)
        toast.message(t('outfit.shareSavedInstead'))
      }
    } catch {
      toast.error(t('outfit.shareFailed'))
    } finally {
      setShareBusy(false)
    }
  }

  function sendFeedback(liked: boolean) {
    if (liked) {
      setLikeAnimating(true)
      window.setTimeout(() => setLikeAnimating(false), 480)
    }
    feedbackMutation.mutate(
      { rawOutfit: raw, liked },
      {
        onSuccess: () => {
          setFeedbackChoice(liked ? 'like' : 'dislike')
        },
      }
    )
  }

  return (
    <>
      <div className="animate-outfit-highlight space-y-6 rounded-2xl border border-accent/35 bg-gradient-to-b from-accent/10 via-surface/80 to-transparent p-4 shadow-lg shadow-accent/10 transition-all duration-500 ease-out sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-600/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
              {t('outfit.pickLabels.minimal')}
            </span>
            {showPremiumMatch ? (
              <span
                className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-950 dark:border-amber-300/25 dark:bg-amber-400/10 dark:text-amber-100"
                role="status"
              >
                {t('outfit.premiumMatchBadge')}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <span className="text-sm font-medium tabular-nums text-foreground">
              {t('outfit.matchConfidence', { percent: matchPercent })}
            </span>
            <div
              className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-border"
              role="presentation"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-[width] duration-700 ease-out"
                style={{ width: `${matchPercent}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted">{t('outfit.stylistHint')}</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="outfit-results-stagger" style={{ animationDelay: '0ms' }}>
            <OutfitPieceCard
              title={
                outfit.top.type === 'dress'
                  ? t('outfit.slots.topDress')
                  : t('outfit.slots.top')
              }
              piece={outfit.top}
              emphasized
            />
          </div>
          <div className="outfit-results-stagger" style={{ animationDelay: '75ms' }}>
            {outfit.bottom ? (
              <OutfitPieceCard
                title={t('outfit.slots.bottom')}
                piece={outfit.bottom}
                emphasized
              />
            ) : (
              <Card className="flex h-full flex-col justify-center border-dashed border-violet-200/50 bg-violet-50/30 p-6 text-center transition-all duration-300 dark:border-violet-900/40 dark:bg-violet-950/20">
                <p className="text-sm font-medium text-foreground">
                  {t('outfit.slots.bottom')}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {t('outfit.dressReplacesBottom')}
                </p>
              </Card>
            )}
          </div>
          <div
            className="outfit-results-stagger sm:col-span-2 lg:col-span-1"
            style={{ animationDelay: '150ms' }}
          >
            <OutfitPieceCard
              title={t('outfit.slots.footwear')}
              piece={outfit.footwear}
              emphasized
            />
          </div>
        </div>

        <div
          className="outfit-results-stagger flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          style={{ animationDelay: '200ms' }}
        >
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={saveOutfitMutation.isPending}
            onClick={() =>
              saveOutfitMutation.mutate({
                top_id: raw.top.id,
                bottom_id: raw.bottom?.id ?? null,
                footwear_id: raw.footwear.id,
              })
            }
          >
            <span className="mr-1.5" aria-hidden>
              ❤️
            </span>
            {saveOutfitMutation.isPending ? t('common.loading') : t('outfit.saveOutfit')}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={shareBusy}
            onClick={() => void handleShareOutfit()}
          >
            {shareBusy ? t('outfit.sharePreparing') : t('outfit.shareOutfit')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={shareBusy}
            onClick={() => void handleDownloadOutfitImage()}
          >
            {shareBusy ? t('outfit.sharePreparing') : t('outfit.downloadOutfitImage')}
          </Button>
        </div>

        <Card
          className="outfit-results-stagger border border-accent/25 bg-surface/95 p-4 transition-all duration-300 sm:p-5"
          style={{ animationDelay: '220ms' }}
        >
          <h2
            id="outfit-why-works-heading"
            className="text-base font-semibold text-foreground"
          >
            {t('outfit.whyWorks')}
          </h2>
          <ul
            className="mt-4 flex list-none flex-col gap-2 p-0 sm:flex-row sm:flex-wrap"
            aria-labelledby="outfit-why-works-heading"
          >
            {rationaleLines.map((line, index) => (
              <li
                key={index}
                className="outfit-results-stagger transition-opacity duration-300 ease-out"
                style={{ animationDelay: `${260 + index * 45}ms` }}
              >
                <span className="inline-flex max-w-full items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-left text-sm leading-snug text-foreground">
                  <span
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  >
                    ✔
                  </span>
                  <span>{line}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div
          className="outfit-results-stagger flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: '320ms' }}
          role="group"
          aria-label={t('outfit.feedbackGroupLabel')}
        >
          <p className="text-sm font-medium text-foreground">
            {t('outfit.feedbackPrompt')}
          </p>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant={feedbackChoice === 'like' ? 'primary' : 'secondary'}
              disabled={feedbackLocked}
              aria-pressed={feedbackChoice === 'like'}
              className={`min-h-11 min-w-[8.5rem] transition-all duration-200 ease-out ${
                feedbackChoice === 'like'
                  ? 'ring-2 ring-primary/55 ring-offset-2 ring-offset-background'
                  : 'hover:scale-[1.02] active:scale-[0.98]'
              } ${likeAnimating ? 'animate-outfit-like-pop' : ''}`}
              onClick={() => sendFeedback(true)}
            >
              <span className="mr-1.5" aria-hidden>
                👍
              </span>
              {sendingLike ? t('common.loading') : t('outfit.like')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={feedbackLocked}
              aria-pressed={feedbackChoice === 'dislike'}
              className={`min-h-11 min-w-[8.5rem] transition-all duration-200 ease-out ${
                feedbackChoice === 'dislike'
                  ? 'bg-danger/15 text-danger ring-2 ring-danger/90 ring-offset-2 ring-offset-background'
                  : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
              onClick={() => sendFeedback(false)}
            >
              <span className="mr-1.5" aria-hidden>
                👎
              </span>
              {sendingDislike ? t('common.loading') : t('outfit.dislike')}
            </Button>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none fixed left-0 top-0 z-[-1] -translate-x-[110vw]"
        aria-hidden
      >
        <OutfitSharePoster
          ref={posterRef}
          outfit={outfit}
          matchPercent={matchPercent}
          copy={posterCopy}
          shareFetchImageSrc={shareFetchImageSrc}
        />
      </div>
    </>
  )
}
