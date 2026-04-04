import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorCode, getErrorMessage } from '@/lib/api/errors'
import { generateStylistRequest, type Occasion, type StylistVibe } from '@/lib/api/outfit'

export function useOutfitStylistMutation() {
  return useMutation({
    mutationFn: ({ occasion, vibe }: { occasion: Occasion; vibe: StylistVibe }) =>
      generateStylistRequest(occasion, vibe),
    onError: (error: unknown) => {
      if (getApiErrorCode(error) === 'OUTFIT_INSUFFICIENT') {
        return
      }
      toast.error(getErrorMessage(error))
    },
  })
}
