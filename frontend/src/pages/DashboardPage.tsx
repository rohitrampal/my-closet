import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loader } from '@/components/ui/Loader'
import { getErrorMessage } from '@/lib/api/errors'
import { useClothesQuery, useDeleteClothesMutation } from '@/lib/api/queries/useClothes'
import type { ClothesItem } from '@/lib/api/types'

function ClothesImage({ item }: { item: ClothesItem }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div
        className="flex aspect-[4/5] w-full items-center justify-center bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
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
      alt=""
      className="aspect-[4/5] w-full object-cover"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </span>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useClothesQuery()
  const deleteMutation = useDeleteClothesMutation()
  const pendingDeleteId = deleteMutation.isPending ? deleteMutation.variables : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {t('dashboard.subtitle')}
          </p>
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
        <Card className="border-red-200/80 dark:border-red-900/50">
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
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
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('clothes.empty')}</p>
          <Button
            type="button"
            className="mt-4"
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
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
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
