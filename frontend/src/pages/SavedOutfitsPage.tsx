import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { type ClothesApiPiece } from '@/lib/api/outfit'
import {
  useDeleteSavedOutfitMutation,
  useSavedOutfitsQuery,
} from '@/lib/api/queries/useSavedOutfits'

function Thumb({ piece, label }: { piece: ClothesApiPiece; label: string }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white/80 dark:border-zinc-800/70 dark:bg-zinc-950/40">
      <p className="border-b border-zinc-200/80 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
        {label}
      </p>
      {broken ? (
        <div
          className="flex aspect-[4/5] w-full items-center justify-center bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
          role="img"
          aria-label={t('clothes.imageUnavailable')}
        >
          {t('clothes.imageUnavailable')}
        </div>
      ) : (
        <img
          src={piece.image_url}
          alt=""
          className="aspect-[4/5] w-full object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  )
}

export function SavedOutfitsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useSavedOutfitsQuery()
  const deleteMutation = useDeleteSavedOutfitMutation()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('savedOutfits.title')}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t('savedOutfits.subtitle')}
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</p>
      )}

      {isError && (
        <Card className="border-red-200/80 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-sm text-zinc-800 dark:text-zinc-100">{t('savedOutfits.loadError')}</p>
          <Button type="button" className="mt-3" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </Card>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <Card className="border-zinc-200/80 bg-white/90 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('savedOutfits.empty')}</p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {data.map((item) => {
            const topLabel =
              item.top.clothes_type === 'dress'
                ? t('outfit.slots.topDress')
                : t('outfit.slots.top')
            const deleting = deleteMutation.isPending && deleteMutation.variables === item.id

            return (
              <Card
                key={item.id}
                className="flex flex-col gap-3 border-violet-200/60 bg-white/90 p-4 dark:border-violet-900/45 dark:bg-zinc-900/80"
              >
                <div className="grid grid-cols-3 gap-2">
                  <Thumb piece={item.top} label={topLabel} />
                  {item.bottom ? (
                    <Thumb piece={item.bottom} label={t('outfit.slots.bottom')} />
                  ) : (
                    <div className="flex flex-col overflow-hidden rounded-lg border border-dashed border-violet-200/60 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/20">
                      <p className="border-b border-violet-200/50 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-violet-900/40 dark:text-zinc-300">
                        {t('outfit.slots.bottom')}
                      </p>
                      <div className="flex flex-1 items-center justify-center p-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        {t('outfit.dressReplacesBottom')}
                      </div>
                    </div>
                  )}
                  <Thumb piece={item.footwear} label={t('outfit.slots.footwear')} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
                  <time
                    className="text-xs text-zinc-500 dark:text-zinc-400"
                    dateTime={item.created_at}
                  >
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                    disabled={deleting}
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    {deleting ? t('common.loading') : t('savedOutfits.delete')}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
