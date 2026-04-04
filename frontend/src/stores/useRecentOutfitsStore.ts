import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GenerateOutfitBundle, Occasion, Weather } from '@/lib/api/outfit'

const MAX_RECENT = 5

/** Persisted standard-mode generation for recall (includes raw payload for feedback). */
export type RecentOutfit = {
  bundle: GenerateOutfitBundle
  occasion: Occasion
  weather: Weather
}

function outfitIdentityKey(bundle: GenerateOutfitBundle): string {
  const bottomId = bundle.raw.bottom?.id ?? 0
  return `${bundle.raw.top.id}-${bottomId}-${bundle.raw.footwear.id}`
}

type RecentOutfitsState = {
  recentOutfits: RecentOutfit[]
  addRecentOutfit: (entry: RecentOutfit) => void
}

export const useRecentOutfitsStore = create<RecentOutfitsState>()(
  persist(
    (set, get) => ({
      recentOutfits: [],
      addRecentOutfit: (entry) => {
        const key = outfitIdentityKey(entry.bundle)
        const withoutDup = get().recentOutfits.filter(
          (item) => outfitIdentityKey(item.bundle) !== key,
        )
        set({
          recentOutfits: [entry, ...withoutDup].slice(0, MAX_RECENT),
        })
      },
    }),
    { name: 'wardrobe-recent-outfits' },
  ),
)
