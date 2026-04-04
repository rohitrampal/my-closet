import { useTranslation } from 'react-i18next'
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
    <section
      aria-label={t('outfit.recentlyGenerated')}
      className="rounded-(--radius-app) border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-5"
    >
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {t('outfit.recentlyGenerated')}
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {t('outfit.recentlyGeneratedHint')}
      </p>
      <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
        {entries.map((entry) => {
          const bundle = entry.bundle
          const { outfit } = bundle
          const topTitle =
            outfit.top.type === 'dress' ? t('outfit.slots.topDress') : t('outfit.slots.top')
          const key = `${bundle.raw.top.id}-${bundle.raw.bottom?.id ?? 0}-${bundle.raw.footwear.id}`

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(entry)}
              className="flex min-w-[min(100%,18rem)] shrink-0 snap-start flex-col gap-2 rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2 text-left ring-offset-2 transition-all hover:border-violet-300/80 hover:bg-violet-50/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:hover:border-violet-700/60 dark:hover:bg-violet-950/25 dark:ring-offset-zinc-950 sm:min-w-[20rem]"
            >
              <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t(`outfit.occasions.${entry.occasion}`)} · {t(`outfit.weathers.${entry.weather}`)}
              </span>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <OutfitPieceCard title={topTitle} piece={outfit.top} compact />
                </div>
                {outfit.bottom ? (
                  <div className="min-w-0 flex-1">
                    <OutfitPieceCard title={t('outfit.slots.bottom')} piece={outfit.bottom} compact />
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center justify-center rounded-(--radius-app) border border-dashed border-zinc-200/80 bg-white/80 px-2 py-3 text-center text-[11px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
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
            </button>
          )
        })}
      </div>
    </section>
  )
}
