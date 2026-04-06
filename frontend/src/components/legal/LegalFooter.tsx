import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const linkClass =
  'text-xs font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline sm:text-sm'

type Props = {
  className?: string
  /** Tighter spacing for auth card layout */
  dense?: boolean
}

export function LegalFooter({ className = '', dense }: Props) {
  const { t } = useTranslation()
  const gap = dense ? 'gap-x-3 gap-y-2' : 'gap-x-4 gap-y-2'

  return (
    <footer
      className={`flex flex-wrap items-center justify-center ${gap} border-t border-border/60 px-4 py-6 text-center ${className}`.trim()}
      aria-label={t('legal.footerAria')}
    >
      <Link to="/terms" className={linkClass}>
        {t('legal.terms')}
      </Link>
      <Link to="/privacy" className={linkClass}>
        {t('legal.privacy')}
      </Link>
      {/* <Link to="/refunds" className={linkClass}>
        {t('legal.refunds')}
      </Link> */}
      <Link to="/contact" className={linkClass}>
        {t('legal.contact')}
      </Link>
    </footer>
  )
}
