import { lazy, Suspense } from 'react'
import { BeforeAfterSection } from '@/components/landing/BeforeAfterSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingNav } from '@/components/landing/LandingNav'
import { SocialProofSection } from '@/components/landing/SocialProofSection'
import { LandingSmoothScroll } from '@/components/landing/SmoothScroll'
import { StickyMobileCtaBar } from '@/components/landing/StickyMobileCtaBar'

const LandingBelowFold = lazy(async () => {
  const m = await import('@/components/landing/LandingBelowFold')
  return { default: m.LandingBelowFold }
})

function BelowFoldFallback() {
  return <div className="min-h-24" aria-hidden />
}

export function LandingPage() {
  return (
    <LandingSmoothScroll>
      <div className="min-h-dvh bg-app pb-24 text-foreground selection:bg-accent/25 selection:text-foreground md:pb-0">
        <div className="landing-ambient" aria-hidden />
        <LandingNav />
        <main>
          <HeroSection />
          <SocialProofSection />
          <BeforeAfterSection />
          <Suspense fallback={<BelowFoldFallback />}>
            <LandingBelowFold />
          </Suspense>
        </main>
        <StickyMobileCtaBar />
      </div>
    </LandingSmoothScroll>
  )
}
