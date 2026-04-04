import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader } from '@/components/ui/Loader'
import { useAuthHydrated } from '@/hooks/useAuthHydrated'
import { useAuthStore } from '@/stores/useAuthStore'

type GuestOnlyProps = {
  children: ReactNode
}

export function GuestOnly({ children }: GuestOnlyProps) {
  const hydrated = useAuthHydrated()
  const token = useAuthStore((s) => s.token)

  if (!hydrated) {
    return <Loader className="min-h-dvh" />
  }

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
