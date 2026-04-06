import { apiClient } from '@/lib/api/client'
import type { ClothesType } from '@/lib/api/types'
import { useUiStore } from '@/stores/useUiStore'

export type AppLanguage = 'en' | 'hi'

function appLanguage(): AppLanguage {
  return useUiStore.getState().language
}

export const OCCASIONS = ['casual', 'party', 'wedding'] as const
export type Occasion = (typeof OCCASIONS)[number]

export const WEATHERS = ['hot', 'cold'] as const
export type Weather = (typeof WEATHERS)[number]

export const STYLIST_VIBES = ['classy', 'trendy', 'bold'] as const
export type StylistVibe = (typeof STYLIST_VIBES)[number]

/** Shape returned by FastAPI `ClothesResponse` (field `clothes_type`). */
export type ClothesApiPiece = {
  id: number
  user_id: number
  image_url: string
  clothes_type: ClothesType
  color: string
  style: string
  created_at: string
}

export type OutfitQuotaApi = {
  used_today: number
  daily_limit: number | null
}

export type OutfitGenerateApiResponse = {
  top: ClothesApiPiece
  bottom: ClothesApiPiece | null
  footwear: ClothesApiPiece
  /** Matcher rationale lines from `POST /outfit/generate` (optional for older responses). */
  reasons?: string[]
  quota?: OutfitQuotaApi
}

export type OutfitStylistApiResponse = {
  options: StylistOptionApiResponse[]
  quota: OutfitQuotaApi
  stylist_tier: 'full' | 'preview'
}

export type OutfitUsageApiResponse = {
  is_premium: boolean
  used_today: number
  daily_limit: number | null
}

export type StylistOptionLabel = 'Minimal' | 'Trendy' | 'Bold'

export type StylistOptionApiResponse = {
  label: StylistOptionLabel
  outfit: OutfitGenerateApiResponse
}

export type OutfitPiece = {
  id: number
  image_url: string
  type: ClothesType
  color: string
  style: string
}

export type GeneratedOutfit = {
  top: OutfitPiece
  bottom: OutfitPiece | null
  footwear: OutfitPiece
}

export type StylistOption = {
  label: StylistOptionLabel
  outfit: GeneratedOutfit
}

/** Mapped outfit + raw API payload (required for `POST /outfit/feedback`). */
export type GenerateOutfitBundle = {
  outfit: GeneratedOutfit
  raw: OutfitGenerateApiResponse
  /** Copy of matcher `reasons` for confidence UI (not sent with feedback). */
  reasons: string[]
  quota?: OutfitQuotaApi
}

/** Map rationale count to a stable match score for display. */
export function matchConfidenceFromReasons(reasons: string[]): number {
  const n = reasons.length
  return Math.min(97, Math.max(72, 72 + Math.min(25, n * 3)))
}

export function stylistOptionConfidence(label: StylistOptionLabel): number {
  switch (label) {
    case 'Minimal':
      return 94
    case 'Trendy':
      return 87
    case 'Bold':
      return 90
    default:
      return 85
  }
}

export type StylistPickLabelKey = 'minimal' | 'trendy' | 'bold'

export function stylistPickLabelKey(label: StylistOptionLabel): StylistPickLabelKey {
  switch (label) {
    case 'Minimal':
      return 'minimal'
    case 'Trendy':
      return 'trendy'
    case 'Bold':
      return 'bold'
    default:
      return 'trendy'
  }
}

function mapPiece(p: ClothesApiPiece): OutfitPiece {
  return {
    id: p.id,
    image_url: p.image_url,
    type: p.clothes_type,
    color: p.color,
    style: p.style,
  }
}

export async function fetchOutfitUsage(): Promise<OutfitUsageApiResponse> {
  const { data } = await apiClient.get<OutfitUsageApiResponse>('/outfit/usage')
  return data
}

export async function generateOutfitRequest(
  occasion: Occasion,
  weather: Weather
): Promise<GenerateOutfitBundle> {
  const { data } = await apiClient.post<OutfitGenerateApiResponse>('/outfit/generate', {
    occasion,
    weather,
    language: appLanguage(),
  })
  return {
    raw: data,
    reasons: data.reasons ?? [],
    quota: data.quota,
    outfit: {
      top: mapPiece(data.top),
      bottom: data.bottom ? mapPiece(data.bottom) : null,
      footwear: mapPiece(data.footwear),
    },
  }
}

export async function generateStylistRequest(
  occasion: Occasion,
  vibe: StylistVibe
): Promise<{ options: StylistOption[]; stylist_tier: 'full' | 'preview'; quota: OutfitQuotaApi }> {
  const { data } = await apiClient.post<OutfitStylistApiResponse>('/outfit/stylist', {
    occasion,
    vibe,
    language: appLanguage(),
  })

  return {
    stylist_tier: data.stylist_tier,
    quota: data.quota,
    options: data.options.map((opt) => ({
      label: opt.label,
      outfit: {
        top: mapPiece(opt.outfit.top),
        bottom: opt.outfit.bottom ? mapPiece(opt.outfit.bottom) : null,
        footwear: mapPiece(opt.outfit.footwear),
      },
    })),
  }
}

export async function submitOutfitFeedbackRequest(
  rawOutfit: OutfitGenerateApiResponse,
  liked: boolean
): Promise<void> {
  await apiClient.post('/outfit/feedback', {
    top_id: rawOutfit.top.id,
    bottom_id: rawOutfit.bottom?.id ?? null,
    footwear_id: rawOutfit.footwear.id,
    liked,
  })
}

export type SavedOutfitApiItem = {
  id: number
  created_at: string
  top: ClothesApiPiece
  bottom: ClothesApiPiece | null
  footwear: ClothesApiPiece
}

export async function saveOutfitRequest(body: {
  top_id: number
  bottom_id: number | null
  footwear_id: number
}): Promise<SavedOutfitApiItem> {
  const { data } = await apiClient.post<SavedOutfitApiItem>('/outfit/save', body)
  return data
}

export async function fetchSavedOutfitsRequest(): Promise<SavedOutfitApiItem[]> {
  const { data } = await apiClient.get<SavedOutfitApiItem[]>('/outfit/saved')
  return data
}

export async function deleteSavedOutfitRequest(savedOutfitId: number): Promise<void> {
  await apiClient.delete(`/outfit/saved/${savedOutfitId}`)
}
