import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader } from '@/components/ui/Loader'
import { useAuthHydrated } from '@/hooks/useAuthHydrated'
import { useAuthStore } from '@/stores/useAuthStore'

type RequireAdminProps = {
  children: ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const hydrated = useAuthHydrated()
  const user = useAuthStore((s) => s.user)

  if (!hydrated) {
    return <Loader className="min-h-dvh" />
  }

  if (!user?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
