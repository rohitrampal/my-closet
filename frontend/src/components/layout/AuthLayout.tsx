import { Outlet } from 'react-router-dom'
import { LegalFooter } from '@/components/legal/LegalFooter'

export function AuthLayout() {
  return (
    <div className="auth-layout-shell flex min-h-dvh flex-col justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="auth-layout-inner animate-page-enter mx-auto w-full max-w-[400px] flex-1">
        <Outlet />
      </div>
      <LegalFooter dense className="mt-auto border-0 pb-2 pt-4" />
    </div>
  )
}
