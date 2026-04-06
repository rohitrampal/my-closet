import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loader } from '@/components/ui/Loader'
import { Heading, Subtext } from '@/components/ui/Typography'
import { fetchClothesTotal } from '@/lib/api/clothes'
import { getErrorMessage } from '@/lib/api/errors'
import { useClothesQuery, useDeleteClothesMutation } from '@/lib/api/queries/useClothes'
import type { ClothesItem } from '@/lib/api/types'
import {
  hasCompletedFirstAutoOutfit,
  hasFirstOutfitRedirectSession,
  setFirstOutfitRedirectSession,
} from '@/lib/onboarding/storage'
import { useAuthStore } from '@/stores/useAuthStore'

function ClothesImage({ item }: { item: ClothesItem }) {
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
      src={item.image_url}
      alt={t('clothes.photoAlt')}
      className="aspect-[4/5] w-full object-cover"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-surface-light px-2.5 py-0.5 text-xs font-medium text-primary-soft">
      {children}
    </span>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data, isPending, isError, error, refetch } = useClothesQuery()
  const { data: wardrobeTotal, isSuccess: totalSuccess } = useQuery({
    queryKey: ['clothes', 'total'],
    queryFn: fetchClothesTotal,
  })
  const deleteMutation = useDeleteClothesMutation()
  const pendingDeleteId = deleteMutation.isPending ? deleteMutation.variables : undefined
  useEffect(() => {
    if (!user?.id || user.is_admin) return
    if (!totalSuccess || wardrobeTotal === undefined) return
    if (wardrobeTotal < 3) return
    if (hasCompletedFirstAutoOutfit(user.id)) return
    if (hasFirstOutfitRedirectSession(user.id)) return
    setFirstOutfitRedirectSession(user.id)
    navigate('/outfit', { state: { runFirstOutfit: true }, replace: true })
  }, [navigate, totalSuccess, user?.id, user?.is_admin, wardrobeTotal])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Heading as="h1" variant="title">
            {t('dashboard.title')}
          </Heading>
          <Subtext className="mt-1">{t('dashboard.subtitle')}</Subtext>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => navigate('/dashboard/upload')}
        >
          {t('nav.upload')}
        </Button>
      </div>

      {isPending && <Loader label={t('common.loading')} />}

      {isError && (
        <Card className="border-danger/40 bg-danger/5">
          <p className="text-sm text-danger" role="alert">
            {getErrorMessage(error)}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => refetch()}
          >
            {t('common.retry')}
          </Button>
        </Card>
      )}

      {!isPending && !isError && data?.length === 0 && (
        <Card className="py-10 text-center">
          <p className="text-base font-medium text-foreground">{t('dashboard.emptyTitle')}</p>
          <p className="mt-2 text-sm text-muted">{t('dashboard.emptySubtitle')}</p>
          <Button
            type="button"
            className="mt-6 w-full min-h-12 touch-manipulation sm:mx-auto sm:max-w-xs"
            onClick={() => navigate('/dashboard/upload')}
          >
            {t('nav.upload')}
          </Button>
        </Card>
      )}

      {!isPending && !isError && data && data.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((item) => (
            <li key={item.id}>
              <Card className="overflow-hidden p-0">
                <ClothesImage item={item} />
                <div className="space-y-3 p-4">
                  <div
                    className="flex flex-wrap gap-1.5"
                    aria-label={t('clothes.tagsLabel')}
                  >
                    <Tag>{t(`clothes.types.${item.type}`)}</Tag>
                    <Tag>{item.color}</Tag>
                    <Tag>{item.style}</Tag>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                    disabled={pendingDeleteId === item.id}
                    aria-label={t('clothes.deleteAria', { id: item.id })}
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    {pendingDeleteId === item.id
                      ? t('common.loading')
                      : t('clothes.delete')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
