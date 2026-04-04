import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/stores/useUiStore'
import { Button } from '@/components/ui/Button'

export function AuthToolbar() {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const theme = useUiStore((s) => s.theme)

  return (
    <div className="mb-8 flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-1 rounded-[var(--radius-app)] bg-zinc-100 p-1 dark:bg-zinc-900">
        <span id="auth-lang-label" className="sr-only">
          {t('common.language')}
        </span>
        <Button
          type="button"
          variant={language === 'en' ? 'secondary' : 'ghost'}
          className="min-h-9 px-3 py-1.5 text-xs"
          aria-pressed={language === 'en'}
          aria-labelledby="auth-lang-label"
          onClick={() => setLanguage('en')}
        >
          EN
        </Button>
        <Button
          type="button"
          variant={language === 'hi' ? 'secondary' : 'ghost'}
          className="min-h-9 px-3 py-1.5 text-xs"
          aria-pressed={language === 'hi'}
          aria-labelledby="auth-lang-label"
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
  )
}
