import { apiClient } from '@/lib/api/client'
import type { ClothesItem, ClothesType } from '@/lib/api/types'
import { useUiStore } from '@/stores/useUiStore'

/** Raw piece shape from FastAPI (`ClothesResponse`). */
export type ClothesApiRow = {
  id: number
  user_id: number
  image_url: string
  clothes_type: ClothesType
  color: string
  style: string
  detection_confidence: number | null
  created_at: string
}

type ClothesListApiResponse = {
  items: ClothesApiRow[]
  total: number
  limit: number
  offset: number
}

export function mapClothesRow(row: ClothesApiRow): ClothesItem {
  return {
    id: row.id,
    image_url: row.image_url,
    type: row.clothes_type,
    color: row.color,
    style: row.style,
    detection_confidence: row.detection_confidence ?? null,
    created_at: row.created_at,
  }
}

export async function fetchClothes(): Promise<ClothesItem[]> {
  const { data } = await apiClient.get<ClothesListApiResponse>('/clothes')
  return data.items.map(mapClothesRow)
}

/** Total wardrobe count (uses minimal page size; for hints/banners). */
export async function fetchClothesTotal(): Promise<number> {
  const { data } = await apiClient.get<ClothesListApiResponse>('/clothes', {
    params: { limit: 1, offset: 0 },
  })
  return data.total
}

export type CreateClothesBody = {
  image_url: string
  clothes_type?: ClothesType | null
  color?: string | null
  style?: string | null
  detection_confidence?: number | null
}

export async function createClothes(body: CreateClothesBody): Promise<ClothesItem> {
  const { data } = await apiClient.post<ClothesApiRow>(
    '/clothes',
    {
      image_url: body.image_url,
      clothes_type: body.clothes_type ?? null,
      color: body.color?.trim() ? body.color.trim() : null,
      style: body.style?.trim() ? body.style.trim() : null,
      detection_confidence: body.detection_confidence ?? null,
    },
    { timeout: 120_000 }
  )
  return mapClothesRow(data)
}

export type ClothesAnalyzeResult = {
  type: ClothesType
  color: string
  style: string
  /** 0–1 heuristic confidence from the API */
  confidence: number
  /** Which provider won in the vision fallback chain */
  source:
    | 'gemini'
    | 'openai'
    | 'groq'
    | 'huggingface'
    | 'sarvam'
    | 'fallback'
}

function formDataConfig(timeoutMs: number) {
  return {
    timeout: timeoutMs,
    transformRequest: [
      (body: unknown, headers: Record<string, string>) => {
        if (body instanceof FormData) {
          delete headers['Content-Type']
        }
        return body
      },
    ],
  }
}

export async function analyzeClothesImage(file: File): Promise<ClothesAnalyzeResult> {
  const formData = new FormData()
  formData.append('file', file)
  const lang = useUiStore.getState().language
  const { data } = await apiClient.post<{
    type: string
    color: string
    style: string
    confidence: number
    source:
      | 'gemini'
      | 'openai'
      | 'groq'
      | 'huggingface'
      | 'sarvam'
      | 'fallback'
  }>('/clothes/analyze', formData, {
    ...formDataConfig(120_000),
    params: { language: lang },
  })
  return {
    type: data.type as ClothesType,
    color: data.color,
    style: data.style,
    confidence: data.confidence,
    source: data.source,
  }
}

export async function uploadClothesImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<{ url: string }>(
    '/clothes/upload',
    formData,
    formDataConfig(120_000)
  )
  return data.url
}

export async function deleteClothes(id: number): Promise<void> {
  await apiClient.delete(`/clothes/${id}`)
}
