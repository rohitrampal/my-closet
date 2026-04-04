import { forwardRef } from 'react'
import type { GeneratedOutfit } from '@/lib/api/outfit'

export type OutfitSharePosterCopy = {
  appName: string
  posterTitle: string
  contextLine: string
  pickBadge: string
  matchLine: string
  topTitle: string
  bottomTitle: string
  footwearTitle: string
  dressNote: string
  topCaption: string
  bottomCaption?: string
  footwearCaption: string
  footerLine: string
}

type OutfitSharePosterProps = {
  outfit: GeneratedOutfit
  matchPercent: number
  copy: OutfitSharePosterCopy
}

const sheet = {
  wrap: {
    boxSizing: 'border-box' as const,
    width: 900,
    background: 'linear-gradient(165deg, #f5f3ff 0%, #fafafa 38%, #ffffff 100%)',
    padding: 40,
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    color: '#18181b',
    borderRadius: 24,
  },
  brand: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#6d28d9',
    marginBottom: 8,
  },
  headline: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    marginBottom: 10,
  },
  context: {
    fontSize: 14,
    color: '#52525b',
    marginBottom: 20,
  },
  badgeRow: {
    display: 'flex' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 28,
  },
  badge: {
    display: 'inline-block' as const,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#065f46',
    background: '#d1fae5',
    padding: '8px 14px',
    borderRadius: 999,
  },
  matchCol: {
    flex: '1 1 auto' as const,
    minWidth: 200,
  },
  matchText: {
    fontSize: 15,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums' as const,
    marginBottom: 6,
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    background: '#e4e4e7',
    overflow: 'hidden' as const,
    maxWidth: 240,
  },
  grid: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
  },
  cellTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    color: '#27272a',
  },
  imgShell: {
    borderRadius: 14,
    overflow: 'hidden' as const,
    border: '1px solid #e4e4e7',
    background: '#fafafa',
  },
  img: {
    display: 'block' as const,
    width: '100%',
    height: 220,
    objectFit: 'cover' as const,
  },
  caption: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 1.45,
    color: '#52525b',
  },
  dressBox: {
    borderRadius: 14,
    border: '2px dashed #c4b5fd',
    background: 'rgba(245, 243, 255, 0.85)',
    minHeight: 220,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    textAlign: 'center' as const,
  },
  dressTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#3f3f46',
    marginBottom: 8,
  },
  dressNote: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 28,
    paddingTop: 20,
    borderTop: '1px solid #e4e4e7',
    fontSize: 11,
    color: '#a1a1aa',
    textAlign: 'center' as const,
  },
}

export const OutfitSharePoster = forwardRef<HTMLDivElement, OutfitSharePosterProps>(
  function OutfitSharePoster({ outfit, copy, matchPercent }, ref) {
    const barWidth = Math.min(100, Math.max(0, matchPercent))

    return (
      <div ref={ref} style={sheet.wrap}>
        <div style={sheet.brand}>{copy.appName}</div>
        <div style={sheet.headline}>{copy.posterTitle}</div>
        <div style={sheet.context}>{copy.contextLine}</div>

        <div style={sheet.badgeRow}>
          <span style={sheet.badge}>{copy.pickBadge}</span>
          <div style={sheet.matchCol}>
            <div style={sheet.matchText}>{copy.matchLine}</div>
            <div style={sheet.barTrack}>
              <div
                style={{
                  height: '100%',
                  width: `${barWidth}%`,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #8b5cf6, #10b981)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={sheet.grid}>
          <div>
            <div style={sheet.cellTitle}>{copy.topTitle}</div>
            <div style={sheet.imgShell}>
              <img
                src={outfit.top.image_url}
                alt=""
                crossOrigin="anonymous"
                style={sheet.img}
              />
            </div>
            <div style={sheet.caption}>{copy.topCaption}</div>
          </div>

          <div>
            <div style={sheet.cellTitle}>{copy.bottomTitle}</div>
            {outfit.bottom ? (
              <>
                <div style={sheet.imgShell}>
                  <img
                    src={outfit.bottom.image_url}
                    alt=""
                    crossOrigin="anonymous"
                    style={sheet.img}
                  />
                </div>
                <div style={sheet.caption}>{copy.bottomCaption ?? ''}</div>
              </>
            ) : (
              <div style={sheet.dressBox}>
                <div style={sheet.dressTitle}>{copy.bottomTitle}</div>
                <div style={sheet.dressNote}>{copy.dressNote}</div>
              </div>
            )}
          </div>

          <div>
            <div style={sheet.cellTitle}>{copy.footwearTitle}</div>
            <div style={sheet.imgShell}>
              <img
                src={outfit.footwear.image_url}
                alt=""
                crossOrigin="anonymous"
                style={sheet.img}
              />
            </div>
            <div style={sheet.caption}>{copy.footwearCaption}</div>
          </div>
        </div>

        <div style={sheet.footer}>{copy.footerLine}</div>
      </div>
    )
  },
)
