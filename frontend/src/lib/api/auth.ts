import { apiClient } from '@/lib/api/client'
import type { AuthResponse } from '@/lib/api/types'

export async function registerRequest(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', {
    email,
    password,
  })
  return data
}

export async function loginRequest(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password })
  return data
}
