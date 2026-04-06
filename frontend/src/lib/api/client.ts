import axios, { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { getErrorMessage } from './errors'
import { i18n } from '@/lib/i18n/config'
import { navigateToLogin } from '@/lib/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUiStore } from '@/stores/useUiStore'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const lang = useUiStore.getState().language
  config.headers['X-App-Language'] = lang
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (import.meta.env.DEV) {
      console.error('[api]', getErrorMessage(error), error)
    }

    if (isAxiosError(error) && error.response?.status === 401) {
      const url = String(error.config?.url ?? '')
      if (
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/signup') ||
        url.includes('/auth/logout')
      ) {
        return Promise.reject(error)
      }
      useAuthStore.getState().logout()
      toast.error(i18n.t('errors.sessionExpired'))
      navigateToLogin()
    }

    return Promise.reject(error)
  }
)
