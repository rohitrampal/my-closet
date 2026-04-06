import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PremiumWelcomeBanner } from '@/components/layout/PremiumWelcomeBanner'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { isOnboardingDismissed } from '@/lib/onboarding/storage'
import { hasSeenPremiumWelcome } from '@/lib/premium/premiumWelcome'
import { performLogout } from '@/lib/api/auth'
import { LegalFooter } from '@/components/legal/LegalFooter'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUiStore } from '@/stores/useUiStore'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-surface-light text-foreground shadow-soft ring-1 ring-border'
      : 'text-muted hover:bg-surface hover:text-foreground'
  }`.trim()

function PremiumWelcomeGate() {
  const [hidden, setHidden] = useState(false)
  const show = !hasSeenPremiumWelcome() && !hidden
  return show ? <PremiumWelcomeBanner onDismissed={() => setHidden(true)} /> : null
}

export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const user = useAuthStore((s) => s.user)

  const showOnboarding = user != null && !user.is_admin && !isOnboardingDismissed(user.id)

  async function handleLogout() {
    await performLogout()
    toast.success(t('toasts.loggedOut'))
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {user?.id && !user.is_admin ? (
        <OnboardingModal open={showOnboarding} userId={user.id} />
      ) : null}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <NavLink
              to="/dashboard"
              className="font-display text-sm font-semibold tracking-tight text-gradient"
            >
              {t('app.name')}
            </NavLink>
            <nav className="flex flex-wrap gap-1" aria-label={t('nav.mainNav')}>
              <NavLink to="/dashboard" end className={navClass}>
                {t('nav.dashboard')}
              </NavLink>
              <NavLink to="/dashboard/upload" className={navClass}>
                {t('nav.upload')}
              </NavLink>
              <NavLink to="/outfit" className={navClass}>
                {t('nav.outfit')}
              </NavLink>
              <NavLink to="/saved-outfits" className={navClass}>
                {t('nav.savedOutfits')}
              </NavLink>
              {user?.is_admin ? (
                <NavLink to="/admin" className={navClass}>
                  {t('nav.admin')}
                </NavLink>
              ) : null}
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-3 py-1.5 text-xs"
              onClick={handleLogout}
            >
              {t('nav.logout')}
            </Button>
            <Card
              padding="none"
              radius="button"
              className="flex items-center gap-1 p-1 shadow-soft"
            >
              <span id="lang-label" className="sr-only">
                {t('common.language')}
              </span>
              <Button
                type="button"
                variant={language === 'en' ? 'secondary' : 'ghost'}
                className="min-h-9 px-3 py-1.5 text-xs"
                aria-pressed={language === 'en'}
                aria-labelledby="lang-label"
                onClick={() => setLanguage('en')}
              >
                EN
              </Button>
              <Button
                type="button"
                variant={language === 'hi' ? 'secondary' : 'ghost'}
                className="min-h-9 px-3 py-1.5 text-xs"
                aria-pressed={language === 'hi'}
                aria-labelledby="lang-label"
                onClick={() => setLanguage('hi')}
              >
                हि
              </Button>
            </Card>
          </div>
        </div>
      </header>
      {user?.is_premium ? <PremiumWelcomeGate key={user.id} /> : null}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        <AppLayout>
          <Outlet />
        </AppLayout>
      </main>
      <LegalFooter className="mt-auto border-border/60 py-5" />
    </div>
  )
}
