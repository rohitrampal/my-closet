import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Heading, Subtext } from '@/components/ui/Typography'
import { type ClothesApiPiece } from '@/lib/api/outfit'
import {
  useDeleteSavedOutfitMutation,
  useSavedOutfitsQuery,
} from '@/lib/api/queries/useSavedOutfits'

function Thumb({ piece, label }: { piece: ClothesApiPiece; label: string }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  return (
    <Card padding="none" radius="button" className="overflow-hidden shadow-soft">
      <p className="border-b border-border px-2 py-1 text-xs font-medium text-foreground">
        {label}
      </p>
      {broken ? (
        <div
          className="flex aspect-[4/5] w-full items-center justify-center bg-surface text-xs text-muted"
          role="img"
          aria-label={t('clothes.imageUnavailable')}
        >
          {t('clothes.imageUnavailable')}
        </div>
      ) : (
        <img
          src={piece.image_url}
          alt={t('clothes.photoAlt')}
          className="aspect-[4/5] w-full object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
    </Card>
  )
}

export function SavedOutfitsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useSavedOutfitsQuery()
  const deleteMutation = useDeleteSavedOutfitMutation()

  return (
    <div className="space-y-8">
      <div>
        <Heading as="h1" variant="title">
          {t('savedOutfits.title')}
        </Heading>
        <Subtext className="mt-1">{t('savedOutfits.subtitle')}</Subtext>
      </div>

      {isLoading && <p className="text-sm text-muted">{t('common.loading')}</p>}

      {isError && (
        <Card className="border-danger/40 bg-danger/5 p-4">
          <p className="text-sm text-foreground">{t('savedOutfits.loadError')}</p>
          <Button
            type="button"
            className="mt-3 w-full sm:w-auto"
            onClick={() => void refetch()}
          >
            {t('common.retry')}
          </Button>
        </Card>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted">{t('savedOutfits.empty')}</p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {data.map((item) => {
            const topLabel =
              item.top.clothes_type === 'dress'
                ? t('outfit.slots.topDress')
                : t('outfit.slots.top')
            const deleting =
              deleteMutation.isPending && deleteMutation.variables === item.id

            return (
              <Card
                key={item.id}
                className="flex flex-col gap-3 border border-accent/25 bg-surface/90 p-4"
              >
                <div className="grid grid-cols-3 gap-2">
                  <Thumb piece={item.top} label={topLabel} />
                  {item.bottom ? (
                    <Thumb piece={item.bottom} label={t('outfit.slots.bottom')} />
                  ) : (
                    <Card
                      padding="none"
                      radius="button"
                      className="flex flex-col overflow-hidden border-dashed border-accent/35 bg-accent/5 shadow-soft"
                    >
                      <p className="border-b border-accent/25 px-2 py-1 text-xs font-medium text-foreground">
                        {t('outfit.slots.bottom')}
                      </p>
                      <div className="flex flex-1 items-center justify-center p-2 text-center text-xs text-muted">
                        {t('outfit.dressReplacesBottom')}
                      </div>
                    </Card>
                  )}
                  <Thumb piece={item.footwear} label={t('outfit.slots.footwear')} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <time className="text-xs text-muted" dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
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
