import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useUiStore } from '@/stores/useUiStore'

export function AuthToolbar() {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
      <Link
        to="/"
        className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-primary-soft hover:underline"
      >
        {t('auth.backToHome')}
      </Link>
      <Card
        padding="none"
        radius="button"
        className="flex items-center gap-1 p-1 shadow-soft"
      >
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
      </Card>
    </div>
  )
}
