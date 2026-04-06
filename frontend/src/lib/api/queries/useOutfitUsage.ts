import { useQuery } from '@tanstack/react-query'
import { fetchOutfitUsage } from '@/lib/api/outfit'

export const outfitUsageQueryKey = ['outfit', 'usage'] as const

export function useOutfitUsageQuery() {
  return useQuery({
    queryKey: outfitUsageQueryKey,
    queryFn: fetchOutfitUsage,
  })
}
