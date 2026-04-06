import { useTranslation } from 'react-i18next'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'

export function StickyMobileCtaBar() {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-border bg-background/90 p-3 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      role="region"
      aria-label={t('landing.stickyCtaAria')}
    >
      <LandingCtaLink className="w-full shadow-fuchsia-900/50" variant="gradient" />
    </div>
  )
}
