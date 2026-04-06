import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSaveOutfitMutation } from '@/lib/api/queries/useSavedOutfits'
import {
  stylistOptionConfidence,
  stylistPickLabelKey,
  type OutfitPiece,
  type StylistOption,
} from '@/lib/api/outfit'
import { PremiumStylistLockedCard } from '@/components/wardrobe/PremiumStylistLockedCard'

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-surface-light px-2.5 py-0.5 text-xs font-medium text-primary-soft">
      {children}
    </span>
  )
}

function PieceImage({ piece }: { piece: OutfitPiece }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div
        className="flex aspect-[4/5] w-full items-center justify-center bg-surface text-sm text-muted"
        role="img"
        aria-label={t('clothes.imageUnavailable')}
      >
        {t('clothes.imageUnavailable')}
      </div>
    )
  }

  return (
    <img
      src={piece.image_url}
      alt={t('clothes.photoAlt')}
      className="aspect-[4/5] w-full object-cover transition-opacity duration-300"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

function PiecePreview({ title, piece }: { title: string; piece: OutfitPiece }) {
  const { t } = useTranslation()

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <PieceImage piece={piece} />
      <div className="flex flex-wrap gap-1.5 p-3" aria-label={t('clothes.tagsLabel')}>
        <Tag>{t(`clothes.types.${piece.type}`)}</Tag>
        <Tag>{piece.color}</Tag>
        <Tag>{piece.style}</Tag>
      </div>
    </Card>
  )
}

const LOCKED_LABEL_KEYS: Array<'trendy' | 'bold'> = ['trendy', 'bold']

export function StylistOptionsResult({
  options,
  lockedPreviewSlots = 0,
}: {
  options: StylistOption[]
  /** Extra blurred cards promoting Premium (e.g. 2 when free tier only got one look). */
  lockedPreviewSlots?: number
}) {
  const { t } = useTranslation()
  const saveMutation = useSaveOutfitMutation()

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {options.map((opt, index) => {
        const { outfit } = opt
        const topTitle =
          outfit.top.type === 'dress' ? t('outfit.slots.topDress') : t('outfit.slots.top')
        const pickKey = stylistPickLabelKey(opt.label)
        const confidence = stylistOptionConfidence(opt.label)

        const savingThis =
          saveMutation.isPending &&
          saveMutation.variables?.top_id === outfit.top.id &&
          saveMutation.variables?.footwear_id === outfit.footwear.id &&
          (saveMutation.variables?.bottom_id ?? null) === (outfit.bottom?.id ?? null)

        return (
          <Card
            key={opt.label}
            className="outfit-results-stagger flex flex-col gap-3 border border-accent/30 bg-surface/90 p-4 transition-all duration-300"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  {t(`outfit.pickLabels.${pickKey}`)}
                </h2>
                <p className="mt-1 text-xs font-medium tabular-nums text-muted">
                  {t('outfit.matchConfidence', { percent: confidence })}
                </p>
              </div>
              <span className="inline-flex shrink-0 self-start rounded-full bg-violet-600/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">
                {t('outfit.stylistBadge')}
              </span>
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-border"
              role="presentation"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-700 ease-out"
                style={{ width: `${confidence}%` }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-1">
              <PiecePreview title={topTitle} piece={outfit.top} />

              {outfit.bottom ? (
                <PiecePreview title={t('outfit.slots.bottom')} piece={outfit.bottom} />
              ) : (
                <div className="rounded-xl border border-dashed border-violet-200/50 bg-violet-50/30 p-4 text-center dark:border-violet-900/40 dark:bg-violet-950/20">
                  <p className="text-sm font-medium text-foreground">
                    {t('outfit.slots.bottom')}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {t('outfit.dressReplacesBottom')}
                  </p>
                </div>
              )}

              <PiecePreview title={t('outfit.slots.footwear')} piece={outfit.footwear} />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={savingThis}
              onClick={() =>
                saveMutation.mutate({
                  top_id: outfit.top.id,
                  bottom_id: outfit.bottom?.id ?? null,
                  footwear_id: outfit.footwear.id,
                })
              }
            >
              <span className="mr-1.5" aria-hidden>
                ❤️
              </span>
              {savingThis ? t('common.loading') : t('outfit.saveOutfit')}
            </Button>
          </Card>
        )
      })}
      {lockedPreviewSlots > 0
        ? LOCKED_LABEL_KEYS.slice(0, lockedPreviewSlots).map((key) => (
            <PremiumStylistLockedCard
              key={key}
              labelHint={t(`outfit.pickLabels.${key}`)}
            />
          ))
        : null}
    </div>
  )
}
