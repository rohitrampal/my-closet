import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/Card'

type DailyRow = { date: string; count: number; label: string }
type RateRow = { date: string; rate: number; label: string; ratePct: number }

const CHART_AXIS = 'var(--chart-axis)'
const CHART_GRID = 'var(--chart-grid)'
const LINE_PRIMARY = 'var(--chart-line-primary)'
const LINE_SECONDARY = 'var(--chart-line-secondary)'

const tooltipBox: CSSProperties = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 'var(--radius-input)',
  fontSize: 12,
  color: 'var(--chart-tooltip-text)',
}

type AdminAnalyticsChartsProps = {
  dailyGenerates: { date: string; count: number }[]
  likeRateTrend: { date: string; rate: number }[]
}

function axisLabel(isoDate: string) {
  return isoDate.slice(5)
}

export function AdminAnalyticsCharts({
  dailyGenerates,
  likeRateTrend,
}: AdminAnalyticsChartsProps) {
  const { t } = useTranslation()

  const genRows: DailyRow[] = dailyGenerates.map((d) => ({
    ...d,
    label: axisLabel(d.date),
  }))

  const rateRows: RateRow[] = likeRateTrend.map((d) => ({
    ...d,
    label: axisLabel(d.date),
    ratePct: d.rate * 100,
  }))

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          {t('admin.chartGenerationsTitle')}
        </h2>
        <p className="mb-4 text-xs text-muted">{t('admin.chartGenerationsHint')}</p>
        <div className="h-[min(280px,50vw)] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={genRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" opacity={0.35} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_GRID }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_GRID }}
                allowDecimals={false}
                width={36}
              />
              <Tooltip
                contentStyle={tooltipBox}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as DailyRow | undefined
                  return row?.date ?? ''
                }}
                formatter={(value) => [value ?? t('common.emDash'), t('admin.chartGenerationsSeries')]}
              />
              <Line
                type="monotone"
                dataKey="count"
                name={t('admin.chartGenerationsSeries')}
                stroke={LINE_PRIMARY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          {t('admin.chartLikeRateTitle')}
        </h2>
        <p className="mb-4 text-xs text-muted">{t('admin.chartLikeRateHint')}</p>
        <div className="h-[min(280px,50vw)] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rateRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" opacity={0.35} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_GRID }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_GRID }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                contentStyle={tooltipBox}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as RateRow | undefined
                  return row?.date ?? ''
                }}
                formatter={(value) => {
                  const n =
                    typeof value === 'number'
                      ? value
                      : Number.parseFloat(value != null ? String(value) : 'NaN')
                  return [
                    Number.isFinite(n) ? `${n.toFixed(1)}%` : t('common.emDash'),
                    t('admin.chartLikeRateSeries'),
                  ]
                }}
              />
              <Line
                type="monotone"
                dataKey="ratePct"
                name={t('admin.chartLikeRateSeries')}
                stroke={LINE_SECONDARY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
