import { Navigate } from 'react-router-dom'
import { Loader } from '@/components/ui/Loader'
import { useAuthHydrated } from '@/hooks/useAuthHydrated'
import { useAuthStore } from '@/stores/useAuthStore'
import { LandingPage } from '@/pages/LandingPage'

export function HomeRedirect() {
  const hydrated = useAuthHydrated()
  const token = useAuthStore((s) => s.token)

  if (!hydrated) {
    return <Loader className="min-h-dvh" />
  }

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage />
}
