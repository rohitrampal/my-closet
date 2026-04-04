import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUiStore } from '@/stores/useUiStore'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
  }`.trim()

export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const theme = useUiStore((s) => s.theme)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  function handleLogout() {
    logout()
    toast.success(t('toasts.loggedOut'))
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <NavLink
              to="/dashboard"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
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
            <div className="flex items-center gap-1 rounded-[var(--radius-app)] bg-zinc-100 p-1 dark:bg-zinc-900">
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
            </div>
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 px-3 py-1.5 text-xs"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark'
                  ? `Switch to ${t('common.light')} mode`
                  : `Switch to ${t('common.dark')} mode`
              }
            >
              {theme === 'dark' ? t('common.light') : t('common.dark')}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
