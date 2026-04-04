import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader } from '@/components/ui/Loader'
import { useAuthHydrated } from '@/hooks/useAuthHydrated'
import { useAuthStore } from '@/stores/useAuthStore'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const hydrated = useAuthHydrated()
  const token = useAuthStore((s) => s.token)

  if (!hydrated) {
    return <Loader className="min-h-dvh" />
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
