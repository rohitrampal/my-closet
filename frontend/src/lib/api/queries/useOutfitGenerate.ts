import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorCode, getErrorMessage } from '@/lib/api/errors'
import { generateOutfitRequest, type Occasion, type Weather } from '@/lib/api/outfit'
import { outfitUsageQueryKey } from '@/lib/api/queries/useOutfitUsage'

export function useOutfitGenerateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ occasion, weather }: { occasion: Occasion; weather: Weather }) =>
      generateOutfitRequest(occasion, weather),
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
