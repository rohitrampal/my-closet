import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { ClothesAnalyzeResult } from '@/lib/api/clothes'
import { CLOTHES_TYPES, type ClothesType } from '@/lib/api/types'
import { STYLE_CHIP_PRESETS, normalizeStyleChip } from '@/lib/wardrobe/styleChipPresets'

function analyzeSourceDescription(source: ClothesAnalyzeResult['source'], t: TFunction): string {
  switch (source) {
    case 'fallback':
      return t('clothes.uploadAnalyzeSourceFallback')
    case 'gemini':
      return t('clothes.uploadAnalyzeSourceGemini')
    case 'openai':
      return t('clothes.uploadAnalyzeSourceOpenAI')
    case 'groq':
      return t('clothes.uploadAnalyzeSourceGroq')
    case 'huggingface':
      return t('clothes.uploadAnalyzeSourceHuggingFace')
    case 'sarvam':
      return t('clothes.uploadAnalyzeSourceSarvam')
    default:
      return t('clothes.uploadAnalyzeSourceFallback')
  }
}

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

export type UploadSlotPhase = 'review' | 'editing' | 'saved'

export type UploadSlotCardProps = {
  id: string
  previewUrl: string
  preparing: boolean
  analyzing: boolean
  analyzeError: string | null
  detected: ClothesAnalyzeResult | null
  phase: UploadSlotPhase
  saving: boolean
  type: string
  color: string
  style: string
  fieldsDisabled: boolean
  onChange: (patch: { type?: string; color?: string; style?: string }) => void
  onEdit: () => void
  onSave: () => void
  onRetryAnalyze?: () => void
  onRemove: () => void
}

export function UploadSlotCard({
  id,
  previewUrl,
  preparing,
  analyzing,
  analyzeError,
  detected,
  phase,
  saving,
  type,
  color,
  style,
  fieldsDisabled,
  onChange,
  onEdit,
  onSave,
  onRetryAnalyze,
  onRemove,
}: UploadSlotCardProps) {
  const { t } = useTranslation()
  const processing = preparing || analyzing
  const styleNorm = normalizeStyleChip(style)
  const chipSelected = (preset: string) => styleNorm === normalizeStyleChip(preset)

  const typeLabel =
    type && CLOTHES_TYPES.includes(type as ClothesType)
      ? t(`clothes.types.${type as ClothesType}`)
      : titleCaseWords(type)

  const showDetectedLine =
    detected &&
    !processing &&
    (detected.type || detected.color || detected.style) &&
    phase === 'review'

  const showEditForm =
    !processing &&
    phase !== 'saved' &&
    (phase === 'editing' || (Boolean(analyzeError) && !detected))

  const showSaved = phase === 'saved' && !processing

  return (
    <div className="animate-upload-fade flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 p-3 sm:p-4">
      <div className="relative overflow-hidden rounded-xl bg-surface-light/50">
        <img
          src={previewUrl}
          alt={t('clothes.photoAlt')}
          className={`upload-preview-blur mx-auto max-h-52 w-full object-contain sm:max-h-56 ${
            processing ? 'scale-[0.98] blur-sm' : ''
          }`}
        />
        {processing && (
          <div
            className="animate-upload-fade absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/55 backdrop-blur-md"
            aria-live="polite"
            aria-busy="true"
          >
            <span
              className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none motion-reduce:border-t-border"
              aria-hidden
            />
            <p className="max-w-56 text-center text-sm font-medium text-foreground">
              {preparing
                ? t('clothes.uploadPreparing')
                : t('clothes.uploadAnalyzingOutfit')}
            </p>
          </div>
        )}
      </div>

      {showDetectedLine && (
        <div className="animate-upload-fade space-y-3">
          <p className="text-xs text-muted">
            {t('clothes.uploadDetectedConfidence', {
              pct: Math.min(
                100,
                Math.max(0, Math.round(Number(detected.confidence) * 100))
              ),
            })}
          </p>
          <p className="text-sm font-medium leading-relaxed text-foreground">
            {t('clothes.uploadWeDetected')}{' '}
            <span className="text-primary">
              {[
                typeLabel || t(`clothes.types.${detected.type}`),
                titleCaseWords(detected.color || color),
                titleCaseWords(detected.style || style),
              ]
                .filter(Boolean)
                .join(' • ')}
            </span>
          </p>
          <p className="text-xs text-muted">
            {analyzeSourceDescription(detected.source, t)}
          </p>
          {detected.source === 'fallback' && onRetryAnalyze ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full touch-manipulation text-sm sm:min-h-10"
              disabled={fieldsDisabled || saving || processing}
              onClick={onRetryAnalyze}
            >
              {t('clothes.uploadRetryAi')}
            </Button>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:flex-1"
              disabled={fieldsDisabled || saving}
              onClick={onSave}
            >
              {saving ? t('clothes.uploadSubmitting') : t('clothes.uploadConfirm')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:flex-1"
              disabled={fieldsDisabled || saving}
              onClick={onEdit}
            >
              {t('clothes.uploadEdit')}
            </Button>
          </div>
        </div>
      )}

      {analyzeError && !processing && phase !== 'saved' && (
        <p className="text-xs text-muted motion-reduce:animate-none" role="status">
          {analyzeError}
        </p>
      )}

      {showEditForm && (
        <div className="animate-upload-fade space-y-3 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('clothes.uploadDetailsSection')}
          </p>
          <Select
            id={`clothes-type-${id}`}
            label={t('clothes.type')}
            disabled={fieldsDisabled || saving}
            value={type}
            onChange={(e) => onChange({ type: e.target.value })}
          >
            <option value="">{t('clothes.selectType')}</option>
            {CLOTHES_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`clothes.types.${value}`)}
              </option>
            ))}
          </Select>
          <Input
            id={`clothes-color-${id}`}
            autoComplete="off"
            label={t('clothes.color')}
            placeholder={t('clothes.colorPlaceholder')}
            disabled={fieldsDisabled || saving}
            value={color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">
              {t('clothes.style')}
            </span>
            <div className="flex flex-wrap gap-2">
              {STYLE_CHIP_PRESETS.map((preset) => {
                const selected = chipSelected(preset)
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={fieldsDisabled || saving}
                    aria-pressed={selected}
                    onClick={() => onChange({ style: preset })}
                    className={[
                      'min-h-11 min-w-22 touch-manipulation rounded-full border px-4 py-2.5 text-sm font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-surface-light text-foreground hover:border-primary-soft',
                      fieldsDisabled || saving ? 'pointer-events-none opacity-50' : '',
                    ].join(' ')}
                  >
                    {t(`clothes.styleChips.${preset}`)}
                  </button>
                )
              })}
            </div>
            <Input
              id={`clothes-style-other-${id}`}
              autoComplete="off"
              label={t('clothes.styleOther')}
              placeholder={t('clothes.styleOtherPlaceholder')}
              disabled={fieldsDisabled || saving}
              value={style}
              onChange={(e) => onChange({ style: e.target.value })}
            />
          </div>
          <Button
            type="button"
            className="min-h-12 w-full touch-manipulation sm:min-h-11"
            disabled={fieldsDisabled || saving}
            onClick={onSave}
          >
            {saving ? t('clothes.uploadSubmitting') : t('clothes.uploadSaveToCloset')}
          </Button>
        </div>
      )}

      {showSaved && (
        <div
          className="animate-upload-fade rounded-xl border border-primary/25 bg-primary/10 px-3 py-3 text-center text-sm font-medium text-foreground"
          role="status"
        >
          {t('clothes.uploadSavedToCloset')}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        className="w-full text-sm text-muted hover:text-danger"
        disabled={fieldsDisabled || saving}
        onClick={onRemove}
      >
        {t('clothes.uploadRemoveSlot')}
      </Button>
    </div>
  )
}
