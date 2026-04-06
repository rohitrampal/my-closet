import { apiClient } from '@/lib/api/client'
import type { AuthResponse, AuthUser } from '@/lib/api/types'
import { useAuthStore } from '@/stores/useAuthStore'

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

/** Refresh the persisted user profile from ``GET /auth/me`` (e.g. after premium purchase). */
export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me')
  useAuthStore.getState().setUser(data)
  return data
}

/** Notify the API and clear local auth. Use for explicit user logout (not for 401 handling). */
export async function performLogout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    /* still clear local session if the network fails */
  }
  useAuthStore.getState().logout()
}

/** Always 204; does not reveal whether the email exists. */
export async function forgotPasswordRequest(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email })
}

export async function resetPasswordRequest(
  token: string,
  password: string
): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, password })
}
