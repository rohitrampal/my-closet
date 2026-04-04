import { LANDING_PRIMARY_CTA } from '@/components/landing/landingCopy'
import { LandingCtaLink } from '@/components/landing/LandingCtaLink'

export function StickyMobileCtaBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-white/10 bg-zinc-950/85 p-3 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      role="region"
      aria-label="Get started"
    >
      <LandingCtaLink className="w-full shadow-fuchsia-900/50" variant="gradient">
        {LANDING_PRIMARY_CTA}
      </LandingCtaLink>
    </div>
  )
}
