import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Loader } from '@/components/ui/Loader'
import { Select } from '@/components/ui/Select'
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts'
import {
  fetchAdminAnalytics,
  fetchAdminDashboard,
  fetchAdminSettings,
  fetchAdminUsers,
  patchAdminSettings,
  patchUserPremium,
  postAdminTestOutfit,
  type AdminTestOutfitResponse,
} from '@/lib/api/admin'
import { getErrorMessage } from '@/lib/api/errors'
import {
  OCCASIONS,
  WEATHERS,
  type ClothesApiPiece,
  type Occasion,
  type Weather,
} from '@/lib/api/outfit'

function PreviewGarment({ piece, label }: { piece: ClothesApiPiece; label: string }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      {broken ? (
        <div
          className="flex aspect-[4/5] w-full max-w-[200px] items-center justify-center rounded-[var(--radius-app)] bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
          role="img"
          aria-label={t('clothes.imageUnavailable')}
        >
          {t('clothes.imageUnavailable')}
        </div>
      ) : (
        <img
          src={piece.image_url}
          alt=""
          className="aspect-[4/5] w-full max-w-[200px] rounded-[var(--radius-app)] object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        {piece.color} · {piece.style}
      </p>
    </div>
  )
}

export function AdminPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const dashboardQ = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchAdminDashboard,
  })

  const usersQ = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchAdminUsers({ limit: 50, offset: 0 }),
  })

  const settingsQ = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchAdminSettings,
  })

  const analyticsQ = useQuery({
    queryKey: ['admin', 'analytics', 30],
    queryFn: () => fetchAdminAnalytics({ days: 30 }),
  })

  const [explore, setExplore] = useState('')
  const [mlWeight, setMlWeight] = useState('')
  const [previewOccasion, setPreviewOccasion] = useState<Occasion>('casual')
  const [previewWeather, setPreviewWeather] = useState<Weather>('hot')
  const [previewResult, setPreviewResult] = useState<AdminTestOutfitResponse | null>(null)

  useEffect(() => {
    if (settingsQ.data) {
      setExplore(String(settingsQ.data.ml_exploration_rate))
      setMlWeight(String(settingsQ.data.ml_weight))
    }
  }, [settingsQ.data])

  const premiumMut = useMutation({
    mutationFn: ({ id, is_premium }: { id: number; is_premium: boolean }) =>
      patchUserPremium(id, is_premium),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success(t('admin.toastPremiumUpdated'))
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  })

  const settingsMut = useMutation({
    mutationFn: () =>
      patchAdminSettings({
        ml_exploration_rate: Number.parseFloat(explore),
        ml_weight: Number.parseFloat(mlWeight),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin', 'analytics'] })
      toast.success(t('admin.toastSettingsSaved'))
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  })

  const flagsMut = useMutation({
    mutationFn: (body: { feature_ai_tagging?: boolean; feature_stylist_mode?: boolean }) =>
      patchAdminSettings(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      toast.success(t('admin.toastFlagsUpdated'))
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  })

  const testOutfitMut = useMutation({
    mutationFn: () =>
      postAdminTestOutfit({ occasion: previewOccasion, weather: previewWeather }),
    onSuccess: (data) => {
      setPreviewResult(data)
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  })

  const loading = dashboardQ.isPending || usersQ.isPending || settingsQ.isPending

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('admin.title')}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('admin.subtitle')}</p>
      </div>

      {loading && <Loader label={t('common.loading')} />}

      {dashboardQ.data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t('admin.stats.users')}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {dashboardQ.data.total_users}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t('admin.stats.outfits')}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {dashboardQ.data.total_outfits_generated}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t('admin.stats.likeRate')}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {(dashboardQ.data.like_rate * 100).toFixed(1)}%
            </p>
          </Card>
        </div>
      )}

      {analyticsQ.isPending && <Loader label={t('admin.chartsLoading')} />}
      {analyticsQ.data && (
        <AdminAnalyticsCharts
          dailyGenerates={analyticsQ.data.daily_generates}
          likeRateTrend={analyticsQ.data.like_rate_trend}
        />
      )}
      {analyticsQ.isError && (
        <Card className="border-red-200/80 p-4 dark:border-red-900/50">
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {getErrorMessage(analyticsQ.error)}
          </p>
        </Card>
      )}

      <Card className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t('admin.previewHeading')}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {t('admin.previewSubtitle')}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <Select
            id="admin-preview-occasion"
            label={t('outfit.occasion')}
            value={previewOccasion}
            onChange={(e) => setPreviewOccasion(e.target.value as Occasion)}
          >
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {t(`outfit.occasions.${o}`)}
              </option>
            ))}
          </Select>
          <Select
            id="admin-preview-weather"
            label={t('outfit.weather')}
            value={previewWeather}
            onChange={(e) => setPreviewWeather(e.target.value as Weather)}
          >
            {WEATHERS.map((w) => (
              <option key={w} value={w}>
                {t(`outfit.weathers.${w}`)}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            disabled={testOutfitMut.isPending}
            onClick={() => testOutfitMut.mutate()}
            className="w-full sm:w-auto"
          >
            {testOutfitMut.isPending ? t('admin.testingOutfit') : t('admin.testOutfit')}
          </Button>
        </div>

        {previewResult && (
          <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="flex flex-wrap gap-6">
              <PreviewGarment
                piece={previewResult.outfit.top}
                label={
                  previewResult.outfit.top.clothes_type === 'dress'
                    ? t('outfit.slots.topDress')
                    : t('outfit.slots.top')
                }
              />
              {previewResult.outfit.bottom ? (
                <PreviewGarment
                  piece={previewResult.outfit.bottom}
                  label={t('outfit.slots.bottom')}
                />
              ) : null}
              <PreviewGarment
                piece={previewResult.outfit.footwear}
                label={t('outfit.slots.footwear')}
              />
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <p className="tabular-nums text-zinc-700 dark:text-zinc-200">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {t('admin.ruleScore')}:
                </span>{' '}
                {previewResult.rule_score.toFixed(2)}
              </p>
              <p className="tabular-nums text-zinc-700 dark:text-zinc-200">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {t('admin.mlScore')}:
                </span>{' '}
                {previewResult.ml_score.toFixed(2)}
              </p>
            </div>
            {previewResult.outfit.reasons && previewResult.outfit.reasons.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t('admin.previewWhy')}
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {previewResult.outfit.reasons.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {usersQ.data && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t('admin.usersHeading')}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('admin.usersCount', { total: usersQ.data.total })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-lg text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300">ID</th>
                  <th className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300">
                    {t('auth.email')}
                  </th>
                  <th className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300">
                    {t('admin.premium')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {usersQ.data.items.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-200">
                      {u.id}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-100">{u.email}</td>
                    <td className="px-4 py-2.5">
                      {u.is_admin ? (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-8 px-3 py-1 text-xs"
                          disabled={premiumMut.isPending}
                          onClick={() =>
                            premiumMut.mutate({ id: u.id, is_premium: !u.is_premium })
                          }
                        >
                          {u.is_premium ? t('admin.removePremium') : t('admin.grantPremium')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {settingsQ.data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t('admin.mlHeading')}
            </h2>
            <Input
              id="admin-ml-explore"
              type="text"
              inputMode="decimal"
              label={t('admin.mlExploration')}
              value={explore}
              onChange={(e) => setExplore(e.target.value)}
            />
            <Input
              id="admin-ml-weight"
              type="text"
              inputMode="decimal"
              label={t('admin.mlWeight')}
              value={mlWeight}
              onChange={(e) => setMlWeight(e.target.value)}
            />
            <Button
              type="button"
              disabled={
                settingsMut.isPending ||
                Number.isNaN(Number.parseFloat(explore)) ||
                Number.isNaN(Number.parseFloat(mlWeight))
              }
              onClick={() => settingsMut.mutate()}
            >
              {t('admin.saveMl')}
            </Button>
          </Card>

          <Card className="space-y-4 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t('admin.flagsHeading')}
            </h2>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-sm text-zinc-700 dark:text-zinc-200">
                  {t('admin.flagAiTagging')}
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
                  checked={settingsQ.data.feature_ai_tagging}
                  disabled={flagsMut.isPending}
                  onChange={(e) =>
                    flagsMut.mutate({ feature_ai_tagging: e.target.checked })
                  }
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-sm text-zinc-700 dark:text-zinc-200">
                  {t('admin.flagStylist')}
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
                  checked={settingsQ.data.feature_stylist_mode}
                  disabled={flagsMut.isPending}
                  onChange={(e) =>
                    flagsMut.mutate({ feature_stylist_mode: e.target.checked })
                  }
                />
              </label>
            </div>
          </Card>
        </div>
      )}

      {(dashboardQ.isError || usersQ.isError || settingsQ.isError) && (
        <Card className="border-red-200/80 p-4 dark:border-red-900/50">
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {getErrorMessage(dashboardQ.error ?? usersQ.error ?? settingsQ.error)}
          </p>
        </Card>
      )}
    </div>
  )
}
