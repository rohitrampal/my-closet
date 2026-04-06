import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useUiStore } from '@/stores/useUiStore'

export function AuthToolbar() {
  const { t } = useTranslation()
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)

  return (
    <div className="mb-6 flex flex-wrap items-center justify-end gap-2 sm:mb-8">
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
