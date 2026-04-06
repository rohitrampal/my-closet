import { API_BASE_URL } from '@/lib/api/client'
import { useAuthStore } from '@/stores/useAuthStore'

/**
 * Fire-and-forget product analytics. Never throws; does not use the shared axios client
 * so failures never trigger global auth handling or toasts.
 */
export function trackEvent(eventName: string, metadata?: Record<string, unknown>): void {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  void fetch(`${API_BASE_URL}/analytics/event`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event_name: eventName, metadata: metadata ?? {} }),
    keepalive: true,
  }).catch(() => {})
}
