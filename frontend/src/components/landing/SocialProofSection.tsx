import { Reveal } from '@/components/landing/Reveal'

const quotes = [
  {
    id: '1',
    stars: '⭐⭐⭐⭐⭐',
    text: 'I used to stare at my clothes for 20 mins… now it just tells me what to wear 😭',
  },
  {
    id: '2',
    stars: '⭐⭐⭐⭐⭐',
    text: 'It feels like I have a personal stylist in my phone',
  },
  {
    id: '3',
    stars: '⭐⭐⭐⭐⭐',
    text: "I didn't realize how bad my outfit choices were until this 💀",
  },
]

export function SocialProofSection() {
  return (
    <section
      className="relative px-4 pb-10 pt-4 md:pb-14 md:pt-6"
      aria-labelledby="social-proof-heading"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2
            id="social-proof-heading"
            className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl"
          >
            People are actually loving this
          </h2>
        </Reveal>

        <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:mt-8 md:grid md:snap-none md:grid-cols-3 md:gap-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {quotes.map((q) => (
            <article
              key={q.id}
              className="w-[min(82vw,18rem)] shrink-0 snap-center rounded-xl border border-white/10 bg-white/[0.05] p-5 shadow-lg shadow-black/20 backdrop-blur-xl md:w-auto md:p-6"
            >
              <p className="text-sm leading-none text-amber-200/90" aria-hidden>
                {q.stars}
              </p>
              <p className="mt-3 text-base font-medium leading-snug text-zinc-100">
                {q.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
