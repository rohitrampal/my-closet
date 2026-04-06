import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LegalFooter } from '@/components/legal/LegalFooter'
import { Heading, Subtext } from '@/components/ui/Typography'

type Props = {
  title: string
  lastUpdated: string
  children: ReactNode
}

const prose =
  'space-y-4 text-sm leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-2 [&_strong]:font-medium [&_strong]:text-foreground'

export function LegalPageShell({ title, lastUpdated, children }: Props) {
  const { t, i18n } = useTranslation()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="text-sm font-medium text-primary underline-offset-4 hover:text-primary-soft hover:underline"
          >
            ← {t('legal.backHome')}
          </Link>
          <span className="font-display text-sm font-semibold text-gradient">
            {t('app.name')}
          </span>
        </div>
      </header>

      <article className={`mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 ${prose}`}>
        <div className="space-y-2 border-b border-border pb-8 not-prose">
          <Heading as="h1" variant="title" className="!text-2xl sm:!text-3xl">
            {title}
          </Heading>
          <Subtext as="p" className="!text-xs sm:!text-sm">
            {t('legal.lastUpdated', { date: lastUpdated })}
          </Subtext>
          {i18n.language.startsWith('hi') ? (
            <p className="text-xs text-muted">{t('legal.hindiNotice')}</p>
          ) : null}
        </div>
        <div className="pt-8">{children}</div>
      </article>

      <LegalFooter className="mx-auto max-w-3xl border-t-0 sm:px-6" />
    </div>
  )
}
