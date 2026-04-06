import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type FirstOutfitFullscreenLoaderProps = {
  open: boolean
}

/**
 * Fullscreen blocking overlay for the auto first-outfit generation flow.
 * Portal + AnimatePresence live here so exit transitions work.
 */
export function FirstOutfitFullscreenLoader({ open }: FirstOutfitFullscreenLoaderProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="first-outfit-fullscreen"
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="first-outfit-fs-title"
          aria-describedby="first-outfit-fs-desc"
          className="fixed inset-0 z-[10050] flex flex-col items-center justify-center overflow-hidden px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.05 : 0.38, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-background/75 backdrop-blur-md" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 50% 42%, var(--glow-accent-strong), transparent 65%), radial-gradient(ellipse 55% 45% at 50% 55%, var(--glow-primary-soft), transparent 60%)',
            }}
            aria-hidden
          />

          <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduce ? 0 : 0.08,
                duration: reduce ? 0.05 : 0.45,
                ease: 'easeOut',
              }}
            >
              <h2
                id="first-outfit-fs-title"
                className="outfit-styling-shimmer text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              >
                {t('outfit.firstOutfitLoadingTitle')}
              </h2>
              <p
                id="first-outfit-fs-desc"
                className="mt-3 text-sm leading-relaxed text-muted sm:text-base"
              >
                {t('outfit.firstOutfitLoadingSubtext')}
              </p>
            </motion.div>

            <div className="mt-10 flex items-center gap-1.5" aria-hidden>
              <span className="outfit-styling-dot h-2 w-2 rounded-full bg-primary/90" />
              <span className="outfit-styling-dot outfit-styling-dot-delay-1 h-2 w-2 rounded-full bg-accent/90" />
              <span className="outfit-styling-dot outfit-styling-dot-delay-2 h-2 w-2 rounded-full bg-primary-soft/90" />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
