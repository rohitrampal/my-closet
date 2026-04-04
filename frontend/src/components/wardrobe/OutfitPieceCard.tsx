import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import type { OutfitPiece } from '@/lib/api/outfit'

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </span>
  )
}

function PieceImage({ piece }: { piece: OutfitPiece }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div
        className="flex aspect-[4/5] w-full items-center justify-center bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
        role="img"
        aria-label={t('clothes.imageUnavailable')}
      >
        {t('clothes.imageUnavailable')}
      </div>
    )
  }

  return (
    <img
      src={piece.image_url}
      alt=""
      className="aspect-[4/5] w-full object-cover transition-opacity duration-300"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

type OutfitPieceCardProps = {
  title: string
  piece: OutfitPiece
  /** Softer highlight when shown inside the stylist / outfit result panel. */
  emphasized?: boolean
  /** Narrow preview row (e.g. recent outfits strip). */
  compact?: boolean
}

export function OutfitPieceCard({
  title,
  piece,
  emphasized = false,
  compact = false,
}: OutfitPieceCardProps) {
  const { t } = useTranslation()

  return (
    <Card
      className={`overflow-hidden p-0 transition-all duration-300 hover:shadow-md ${
        emphasized
          ? 'ring-1 ring-violet-300/60 shadow-md shadow-violet-500/5 dark:ring-violet-600/35 dark:shadow-violet-950/20'
          : ''
      }`.trim()}
    >
      <div
        className={`border-b border-zinc-200/80 dark:border-zinc-800 ${
          compact ? 'px-2.5 py-1.5' : 'px-4 py-2.5'
        }`}
      >
        <h3
          className={`font-semibold text-zinc-900 dark:text-zinc-50 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {title}
        </h3>
      </div>
      <PieceImage piece={piece} />
      {!compact ? (
        <div className="flex flex-wrap gap-1.5 p-4" aria-label={t('clothes.tagsLabel')}>
          <Tag>{t(`clothes.types.${piece.type}`)}</Tag>
          <Tag>{piece.color}</Tag>
          <Tag>{piece.style}</Tag>
        </div>
      ) : null}
    </Card>
  )
}
