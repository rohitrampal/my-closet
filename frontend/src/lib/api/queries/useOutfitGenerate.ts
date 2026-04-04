import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorCode, getErrorMessage } from '@/lib/api/errors'
import { generateOutfitRequest, type Occasion, type Weather } from '@/lib/api/outfit'

export function useOutfitGenerateMutation() {
  return useMutation({
    mutationFn: ({ occasion, weather }: { occasion: Occasion; weather: Weather }) =>
      generateOutfitRequest(occasion, weather),
    onError: (error: unknown) => {
      if (getApiErrorCode(error) === 'OUTFIT_INSUFFICIENT') {
        return
      }
      toast.error(getErrorMessage(error))
    },
  })
}
