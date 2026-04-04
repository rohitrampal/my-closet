import { apiClient } from '@/lib/api/client'
import type { ClothesItem, ClothesType } from '@/lib/api/types'

export async function fetchClothes(): Promise<ClothesItem[]> {
  const { data } = await apiClient.get<ClothesItem[]>('/clothes')
  return data
}

export type CreateClothesBody = {
  image_url: string
  type: ClothesType
  color: string
  style: string
}

export async function createClothes(body: CreateClothesBody): Promise<ClothesItem> {
  const { data } = await apiClient.post<ClothesItem>('/clothes', body)
  return data
}

export async function deleteClothes(id: number): Promise<void> {
  await apiClient.delete(`/clothes/${id}`)
}
