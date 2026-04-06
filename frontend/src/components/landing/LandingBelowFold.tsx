import { DemoSection } from '@/components/landing/DemoSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { FinalCtaSection } from '@/components/landing/FinalCtaSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { LegalFooter } from '@/components/legal/LegalFooter'
import { PremiumSection } from '@/components/landing/PremiumSection'

export function LandingBelowFold() {
  return (
    <>
      <HowItWorksSection />
      <DemoSection />
      <FeaturesSection />
      <PremiumSection />
      <FinalCtaSection />
      <LegalFooter className="border-border/40 bg-background/40 backdrop-blur-sm" />
    </>
  )
}
