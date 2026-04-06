import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import type { OutfitPiece } from '@/lib/api/outfit'

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-surface-light px-2.5 py-0.5 text-xs font-medium text-primary-soft">
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
        className="flex aspect-[4/5] w-full items-center justify-center bg-surface text-sm text-muted"
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
      alt={t('clothes.photoAlt')}
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
        className={`border-b border-border ${compact ? 'px-2.5 py-1.5' : 'px-4 py-2.5'}`}
      >
        <h3
          className={`font-semibold text-foreground ${compact ? 'text-xs' : 'text-sm'}`}
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
