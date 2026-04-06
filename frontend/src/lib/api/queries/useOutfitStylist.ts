import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorCode, getErrorMessage } from '@/lib/api/errors'
import { generateStylistRequest, type Occasion, type StylistVibe } from '@/lib/api/outfit'
import { outfitUsageQueryKey } from '@/lib/api/queries/useOutfitUsage'

export function useOutfitStylistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ occasion, vibe }: { occasion: Occasion; vibe: StylistVibe }) =>
      generateStylistRequest(occasion, vibe),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: outfitUsageQueryKey })
    },
    onError: (error: unknown) => {
      const code = getApiErrorCode(error)
      if (code === 'OUTFIT_INSUFFICIENT' || code === 'OUTFIT_DAILY_LIMIT') {
        return
      }
      toast.error(getErrorMessage(error))
    },
  })
}
