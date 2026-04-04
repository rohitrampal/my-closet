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
      <div className="min-h-dvh bg-[#07060b] pb-24 text-zinc-100 selection:bg-fuchsia-500/30 selection:text-white md:pb-0">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(168,85,247,0.18),transparent_50%)]" />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(236,72,153,0.08),transparent_45%)]" />
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
