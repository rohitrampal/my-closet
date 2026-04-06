export const CLOTHES_TYPES = [
  'top',
  'bottom',
  'dress',
  'outerwear',
  'footwear',
  'accessory',
] as const

export type ClothesType = (typeof CLOTHES_TYPES)[number]

export type AuthUser = {
  id: number
  email: string
  is_premium?: boolean
  is_admin?: boolean
  created_at?: string
}

export type AuthResponse = {
  access_token: string
  token_type: string
  user: AuthUser
}

export type ClothesItem = {
  id: number
  image_url: string
  type: ClothesType
  color: string
  style: string
  detection_confidence?: number | null
  created_at: string
}
