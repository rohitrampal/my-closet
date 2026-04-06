import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Heading } from '@/components/ui/Typography'
import { OutfitPieceCard } from '@/components/wardrobe/OutfitPieceCard'
import type { RecentOutfit } from '@/stores/useRecentOutfitsStore'

type RecentOutfitsStripProps = {
  entries: RecentOutfit[]
  onSelect: (entry: RecentOutfit) => void
}

export function RecentOutfitsStrip({ entries, onSelect }: RecentOutfitsStripProps) {
  const { t } = useTranslation()

  if (entries.length === 0) return null

  return (
    <Card aria-label={t('outfit.recentlyGenerated')}>
      <Heading as="h2" variant="section">
        {t('outfit.recentlyGenerated')}
      </Heading>
      <p className="typography-subtext mt-1 text-xs">
        {t('outfit.recentlyGeneratedHint')}
      </p>
      <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:ring-1 [&::-webkit-scrollbar-thumb]:ring-primary/20">
        {entries.map((entry) => {
          const bundle = entry.bundle
          const { outfit } = bundle
          const topTitle =
            outfit.top.type === 'dress'
              ? t('outfit.slots.topDress')
              : t('outfit.slots.top')
          const key = `${bundle.raw.top.id}-${bundle.raw.bottom?.id ?? 0}-${bundle.raw.footwear.id}`

          return (
            <Button
              key={key}
              type="button"
              variant="surface"
              onClick={() => onSelect(entry)}
              className="min-w-[min(100%,18rem)] shrink-0 snap-start p-2 sm:min-w-[20rem]"
            >
              <span className="typography-subtext px-1 text-[11px] font-medium uppercase tracking-wide">
                {t(`outfit.occasions.${entry.occasion}`)} ·{' '}
                {t(`outfit.weathers.${entry.weather}`)}
              </span>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <OutfitPieceCard title={topTitle} piece={outfit.top} compact />
                </div>
                {outfit.bottom ? (
                  <div className="min-w-0 flex-1">
                    <OutfitPieceCard
                      title={t('outfit.slots.bottom')}
                      piece={outfit.bottom}
                      compact
                    />
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-dashed border-border bg-surface/80 px-2 py-3 text-center text-[11px] typography-subtext">
                    {t('outfit.dressReplacesBottom')}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <OutfitPieceCard
                    title={t('outfit.slots.footwear')}
                    piece={outfit.footwear}
                    compact
                  />
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
