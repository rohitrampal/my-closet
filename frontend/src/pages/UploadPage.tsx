import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Heading, Subtext } from '@/components/ui/Typography'
import {
  UploadSlotCard,
  type UploadSlotPhase,
} from '@/components/wardrobe/UploadSlotCard'
import {
  analyzeClothesImage,
  checkDuplicateClothes,
  createClothes,
  fetchClothesTotal,
  uploadClothesImage,
  type ClothesAnalyzeResult,
  type DuplicateClothesItem,
} from '@/lib/api/clothes'
import { getErrorMessage } from '@/lib/api/errors'
import { clothesQueryKey } from '@/lib/api/queries/useClothes'
import type { ClothesType } from '@/lib/api/types'
import { CLOTHES_TYPES } from '@/lib/api/types'
import { compressImageToJpegFile } from '@/lib/images/compressImageFile'

const MAX_ITEMS = 5

type UploadSlot = {
  id: string
  /** Original pick; cleared after compression. */
  file: File | null
  previewUrl: string
  /** Compressed JPEG for analyze + upload. */
  imageFile: File | null
  preparing: boolean
  analyzing: boolean
  analyzeError: string | null
  detected: ClothesAnalyzeResult | null
  phase: UploadSlotPhase
  saving: boolean
  duplicateChecking: boolean
  similarItems: DuplicateClothesItem[]
  type: string
  color: string
  style: string
}

function emptySlot(id: string, previewUrl: string, file: File): UploadSlot {
  return {
    id,
    file,
    previewUrl,
    imageFile: null,
    preparing: true,
    analyzing: false,
    analyzeError: null,
    detected: null,
    phase: 'review',
    saving: false,
    duplicateChecking: false,
    similarItems: [],
    type: '',
    color: '',
    style: '',
  }
}

export function UploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dropId = useId()
  const fileGalleryRef = useRef<HTMLInputElement>(null)
  const fileCameraRef = useRef<HTMLInputElement>(null)
  const pipelineStartedRef = useRef(new Set<string>())
  const slotsRef = useRef<UploadSlot[]>([])

  const [slots, setSlots] = useState<UploadSlot[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [globalHint, setGlobalHint] = useState<string | null>(null)

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  const { data: wardrobeTotal = 0, isPending: wardrobeCountPending } = useQuery({
    queryKey: ['clothes', 'total'],
    queryFn: fetchClothesTotal,
  })

  const updateSlot = useCallback((id: string, patch: Partial<UploadSlot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const removeSlot = useCallback((id: string) => {
    pipelineStartedRef.current.delete(id)
    setSlots((prev) => {
      const target = prev.find((s) => s.id === id)
      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  const saveSlotToCloset = useCallback(
    async (id: string) => {
      const s = slotsRef.current.find((x) => x.id === id)
      if (!s?.imageFile || s.phase === 'saved') return
      const typeVal = s.type.trim()
      const colorVal = s.color.trim()
      const styleVal = s.style.trim()
      if (!typeVal || !colorVal || !styleVal) {
        toast.error(t('clothes.uploadSaveNeedsFields'))
        return
      }
      if (!CLOTHES_TYPES.includes(typeVal as ClothesType)) {
        toast.error(t('validation.typeInvalid'))
        return
      }
      updateSlot(id, { saving: true })
      try {
        const publicUrl = await uploadClothesImage(s.imageFile)
        await createClothes({
          image_url: publicUrl,
          clothes_type: typeVal as ClothesType,
          color: colorVal,
          style: styleVal,
          detection_confidence: s.detected?.confidence ?? null,
        })
        await queryClient.invalidateQueries({ queryKey: clothesQueryKey })
        await queryClient.invalidateQueries({ queryKey: ['clothes', 'total'] })
        toast.success(t('toasts.clothesCreated'))
        updateSlot(id, { phase: 'saved', saving: false, analyzeError: null })
      } catch (err) {
        updateSlot(id, { saving: false })
        toast.error(getErrorMessage(err))
      }
    },
    [queryClient, t, updateSlot]
  )

  const startEditSlot = useCallback(
    (id: string) => {
      updateSlot(id, { phase: 'editing' })
    },
    [updateSlot]
  )

  const reanalyzeSlot = useCallback(
    async (id: string) => {
      const s = slotsRef.current.find((x) => x.id === id)
      if (!s?.imageFile || s.phase === 'saved') return
      updateSlot(id, { analyzing: true, analyzeError: null })
      try {
        const hints = await analyzeClothesImage(s.imageFile)
        updateSlot(id, { duplicateChecking: true, similarItems: [] })
        let similarItems: DuplicateClothesItem[] = []
        try {
          const dupe = await checkDuplicateClothes(s.imageFile, hints.type)
          similarItems = dupe.similar_items
        } catch {
          similarItems = []
        }
        updateSlot(id, {
          analyzing: false,
          duplicateChecking: false,
          similarItems,
          detected: hints,
          phase: 'review',
          type: hints.type,
          color: hints.color,
          style: hints.style,
          analyzeError: null,
        })
      } catch (e) {
        updateSlot(id, {
          analyzing: false,
          duplicateChecking: false,
          analyzeError: getErrorMessage(e),
        })
      }
    },
    [updateSlot]
  )

  useEffect(() => {
    return () => {
      pipelineStartedRef.current.clear()
      setSlots((prev) => {
        for (const s of prev) {
          if (s.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(s.previewUrl)
          }
        }
        return []
      })
    }
  }, [])

  useEffect(() => {
    for (const s of slots) {
      if (!s.file || !s.preparing) continue
      if (pipelineStartedRef.current.has(s.id)) continue
      pipelineStartedRef.current.add(s.id)

      const { id, file } = s
      void (async () => {
        try {
          const imageFile = await compressImageToJpegFile(file)
          updateSlot(id, {
            imageFile,
            preparing: false,
            analyzing: true,
            file: null,
            analyzeError: null,
          })
          try {
            const hints = await analyzeClothesImage(imageFile)
            updateSlot(id, { duplicateChecking: true, similarItems: [] })
            let similarItems: DuplicateClothesItem[] = []
            try {
              const dupe = await checkDuplicateClothes(imageFile, hints.type)
              similarItems = dupe.similar_items
            } catch {
              similarItems = []
            }
            updateSlot(id, {
              analyzing: false,
              duplicateChecking: false,
              similarItems,
              detected: hints,
              phase: 'review',
              type: hints.type,
              color: hints.color,
              style: hints.style,
              analyzeError: null,
            })
          } catch (e) {
            updateSlot(id, {
              analyzing: false,
              duplicateChecking: false,
              similarItems: [],
              detected: null,
              phase: 'editing',
              type: '',
              color: '',
              style: '',
              analyzeError: getErrorMessage(e),
            })
          }
        } catch {
          updateSlot(id, {
            preparing: false,
            analyzing: false,
            imageFile: null,
            file: null,
            phase: 'editing',
            analyzeError: t('clothes.uploadCompressFailed'),
          })
        }
      })()
    }
  }, [slots, t, updateSlot])

  const enqueueFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList?.length) return
      const images = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
      if (!images.length) {
        setGlobalHint(t('clothes.uploadInvalidType'))
        return
      }

      setSlots((prev) => {
        const room = MAX_ITEMS - prev.length
        if (room <= 0) {
          setGlobalHint(t('clothes.uploadMaxItems', { max: MAX_ITEMS }))
          return prev
        }
        const chunk = images.slice(0, room)
        if (images.length > room) {
          setGlobalHint(t('clothes.uploadMaxItems', { max: MAX_ITEMS }))
        } else {
          setGlobalHint(null)
        }
        const next = chunk.map((file) => {
          const id = crypto.randomUUID()
          const previewUrl = URL.createObjectURL(file)
          return emptySlot(id, previewUrl, file)
        })
        return [...prev, ...next]
      })
    },
    [t]
  )

  const onGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    enqueueFiles(e.target.files)
    e.target.value = ''
  }

  const onCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) enqueueFiles([f])
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    enqueueFiles(e.dataTransfer.files)
  }

  const anySaving = slots.some((s) => s.saving)
  const anyProcessing = slots.some((s) => s.preparing || s.analyzing || s.duplicateChecking)

  const showFirstTimeBanner = !wardrobeCountPending && wardrobeTotal < 3

  return (
    <div className="space-y-6">
      {showFirstTimeBanner && (
        <div
          className="animate-upload-fade rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-center text-sm font-medium text-foreground"
          role="status"
        >
          {t('clothes.firstUploadBanner')}
        </div>
      )}

      <div>
        <Heading as="h1" variant="title">
          {t('clothes.uploadTitle')}
        </Heading>
        <Subtext className="mt-2 max-w-md whitespace-pre-line text-base leading-relaxed">
          {t('clothes.uploadSubtitle')}
        </Subtext>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="space-y-5">
          <input
            ref={fileGalleryRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onGalleryChange}
          />
          <input
            ref={fileCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onCameraChange}
          />

          <div>
            <p id={`${dropId}-label`} className="mb-2 text-sm font-medium text-primary">
              {t('clothes.uploadPhotoLabel')}
            </p>
            <div
              role="region"
              aria-labelledby={`${dropId}-label`}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOver(false)
                }
              }}
              onDrop={onDrop}
              className={[
                'rounded-2xl border-2 border-dashed px-3 py-4 transition-colors sm:px-4 sm:py-5',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface-light/60',
                slots.length === 0
                  ? 'flex min-h-[200px] flex-col items-center justify-center gap-4 sm:min-h-[240px]'
                  : 'space-y-4',
              ].join(' ')}
            >
              {slots.length === 0 && (
                <p className="text-center text-sm text-muted">
                  {t('clothes.uploadDropHint')}
                </p>
              )}

              {slots.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {slots.map((slot) => (
                    <li key={slot.id}>
                      <UploadSlotCard
                        id={slot.id}
                        previewUrl={slot.previewUrl}
                        preparing={slot.preparing}
                        analyzing={slot.analyzing}
                        analyzeError={slot.analyzeError}
                        detected={slot.detected}
                        phase={slot.phase}
                        saving={slot.saving}
                        duplicateChecking={slot.duplicateChecking}
                        similarItems={slot.similarItems}
                        type={slot.type}
                        color={slot.color}
                        style={slot.style}
                        fieldsDisabled={false}
                        onChange={(patch) => updateSlot(slot.id, patch)}
                        onEdit={() => startEditSlot(slot.id)}
                        onSave={() => void saveSlotToCloset(slot.id)}
                        onRetryAnalyze={() => void reanalyzeSlot(slot.id)}
                        onSaveAnyway={() => void saveSlotToCloset(slot.id)}
                        onSkipDuplicate={() => removeSlot(slot.id)}
                        onRemove={() => removeSlot(slot.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex w-full max-w-md flex-col gap-2 sm:mx-auto sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  className="min-h-12 w-full touch-manipulation text-base sm:min-h-11 sm:flex-1"
                  disabled={anySaving || slots.length >= MAX_ITEMS}
                  onClick={() => fileGalleryRef.current?.click()}
                >
                  {slots.length
                    ? t('clothes.uploadAddMore')
                    : t('clothes.uploadPickGallery')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 w-full touch-manipulation text-base sm:min-h-11 sm:flex-1"
                  disabled={anySaving || slots.length >= MAX_ITEMS}
                  onClick={() => fileCameraRef.current?.click()}
                >
                  {t('clothes.uploadUseCamera')}
                </Button>
              </div>
            </div>
            {globalHint && (
              <p className="mt-2 text-sm text-muted" role="status">
                {globalHint}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={anySaving || anyProcessing}
              onClick={() => navigate(-1)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-center text-sm text-muted">
        <Link
          to="/dashboard"
          className="font-medium text-primary underline-offset-4 hover:text-primary-soft hover:underline"
        >
          {t('nav.dashboard')}
        </Link>
      </p>
    </div>
  )
}
