import { apiClient } from '@/lib/api/client'
import type { OutfitGenerateApiResponse } from '@/lib/api/outfit'
import { useUiStore } from '@/stores/useUiStore'

export type AdminDashboardStats = {
  total_users: number
  total_outfits_generated: number
  like_rate: number
}

export type AdminUserRow = {
  id: number
  email: string
  is_premium: boolean
  is_admin: boolean
  created_at: string
}

export type AdminUserList = {
  items: AdminUserRow[]
  total: number
  limit: number
  offset: number
}

export type AdminSystemSettings = {
  ml_exploration_rate: number
  ml_weight: number
  feature_ai_tagging: boolean
  feature_stylist_mode: boolean
  outfits_generated_total: number
}

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  const { data } = await apiClient.get<AdminDashboardStats>('/admin/dashboard')
  return data
}

export async function fetchAdminUsers(params: {
  limit?: number
  offset?: number
}): Promise<AdminUserList> {
  const { data } = await apiClient.get<AdminUserList>('/admin/users', { params })
  return data
}

export async function patchUserPremium(
  userId: number,
  is_premium: boolean
): Promise<AdminUserRow> {
  const { data } = await apiClient.patch<AdminUserRow>(`/admin/users/${userId}/premium`, {
    is_premium,
  })
  return data
}

export async function fetchAdminSettings(): Promise<AdminSystemSettings> {
  const { data } = await apiClient.get<AdminSystemSettings>('/admin/settings')
  return data
}

export type AdminAnalyticsResponse = {
  daily_generates: { date: string; count: number }[]
  like_rate_trend: { date: string; rate: number }[]
}

export async function fetchAdminAnalytics(params?: {
  days?: number
}): Promise<AdminAnalyticsResponse> {
  const { data } = await apiClient.get<AdminAnalyticsResponse>('/admin/analytics', {
    params: { days: params?.days ?? 30 },
  })
  return data
}

export type AdminAnalyticsSummary = {
  total_generates: number
  total_upgrades_clicked: number
  total_payments: number
  conversion_rate: number
}

export async function fetchAdminAnalyticsSummary(): Promise<AdminAnalyticsSummary> {
  const { data } = await apiClient.get<AdminAnalyticsSummary>('/admin/analytics-summary')
  return data
}

export type AdminTestOutfitResponse = {
  outfit: OutfitGenerateApiResponse
  ml_score: number
  rule_score: number
  score_debug?: Record<string, number | string> | null
}

export async function postAdminTestOutfit(body: {
  occasion: string
  weather: string
  debug_scores?: boolean
  language?: 'en' | 'hi'
}): Promise<AdminTestOutfitResponse> {
  const { data } = await apiClient.post<AdminTestOutfitResponse>('/admin/test-outfit', {
    occasion: body.occasion,
    weather: body.weather,
    debug_scores: body.debug_scores ?? true,
    language: body.language ?? useUiStore.getState().language,
  })
  return data
}

export async function patchAdminSettings(
  body: Partial<{
    ml_exploration_rate: number
    ml_weight: number
    feature_ai_tagging: boolean
    feature_stylist_mode: boolean
  }>
): Promise<AdminSystemSettings> {
  const { data } = await apiClient.patch<AdminSystemSettings>('/admin/settings', body)
  return data
}
