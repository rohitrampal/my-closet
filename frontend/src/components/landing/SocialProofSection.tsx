import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/landing/Reveal'
import { Card } from '@/components/ui/Card'
import { Heading } from '@/components/ui/Typography'

const QUOTE_KEYS = ['q1', 'q2', 'q3'] as const

export function SocialProofSection() {
  const { t } = useTranslation()

  return (
    <section
      className="relative px-4 pb-10 pt-4 md:pb-14 md:pt-6"
      aria-labelledby="social-proof-heading"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <Heading
            as="h2"
            id="social-proof-heading"
            variant="title"
            className="font-display md:text-3xl"
          >
            {t('landing.socialProof.title')}
          </Heading>
        </Reveal>

        <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:mt-8 md:grid md:snap-none md:grid-cols-3 md:gap-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {QUOTE_KEYS.map((key) => (
            <Card
              key={key}
              as="article"
              interactive
              padding="md"
              className="w-[min(82vw,18rem)] shrink-0 snap-center md:w-auto md:p-6"
            >
              <p className="text-sm leading-none text-primary-soft" aria-hidden>
                {t('landing.socialProof.fiveStars')}
              </p>
              <p className="mt-3 text-base font-medium leading-snug typography-heading">
                {t(`landing.socialProof.${key}`)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
