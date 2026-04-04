import { GlassCard } from '@/components/landing/GlassCard'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'

export function BeforeAfterSection() {
  return (
    <section
      className="relative px-4 py-10 md:py-14"
      aria-labelledby="before-after-heading"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2
            id="before-after-heading"
            className="font-display text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl"
          >
            <span className="block">From “I have nothing to wear”</span>
            <span className="mt-1 block text-fuchsia-200/95">
              to “this looks perfect”
            </span>
          </h2>
        </Reveal>

        <div className="mt-8 flex flex-col gap-4 md:mt-10 md:grid md:grid-cols-2 md:gap-6">
          <Reveal delay={0.05} className="h-full">
            <TiltCard className="h-full">
              <GlassCard className="h-full p-5 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Before
                </p>
                <h3 className="font-display mt-1 text-lg font-semibold text-zinc-300 md:text-xl">
                  What I used to wear
                </h3>
                <div className="mt-4 space-y-3 rounded-xl bg-zinc-900/60 p-4 ring-1 ring-white/5">
                  <div className="flex gap-3 opacity-70">
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-700" />
                    <div className="flex flex-1 flex-col justify-center gap-1.5">
                      <div className="h-2 w-3/4 rounded bg-zinc-600" />
                      <div className="h-2 w-1/2 rounded bg-zinc-700" />
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-500">
                    <span className="block">Overthinking.</span>
                    <span className="block">Trying random combinations.</span>
                    <span className="block">Still not satisfied.</span>
                  </p>
                </div>
              </GlassCard>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.1} className="h-full">
            <TiltCard className="h-full">
              <GlassCard className="h-full border-fuchsia-500/20 p-5 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400/90">
                  After
                </p>
                <h3 className="font-display mt-1 text-lg font-semibold text-white md:text-xl">
                  AI styled outfit
                </h3>
                <div className="mt-4 space-y-3 rounded-xl bg-gradient-to-br from-fuchsia-950/40 to-violet-950/30 p-4 ring-1 ring-fuchsia-500/20">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-rose-400/50 to-fuchsia-600/40" />
                    <ul className="flex flex-1 flex-col justify-center gap-1 text-sm text-zinc-200">
                      <li className="font-medium text-white">Merino crew</li>
                      <li>Wide pleat trousers</li>
                      <li className="text-zinc-400">Leather loafer</li>
                    </ul>
                  </div>
                  <p className="text-sm leading-relaxed text-fuchsia-200/85">
                    <span className="block">Instant outfit.</span>
                    <span className="block">Matches your style.</span>
                    <span className="block">Feels right every time.</span>
                  </p>
                </div>
              </GlassCard>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
