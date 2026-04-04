import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/errors'
import {
  submitOutfitFeedbackRequest,
  type OutfitGenerateApiResponse,
} from '@/lib/api/outfit'
import { i18n } from '@/lib/i18n/config'

export function useOutfitFeedbackMutation() {
  return useMutation({
    mutationFn: ({
      rawOutfit,
      liked,
    }: {
      rawOutfit: OutfitGenerateApiResponse
      liked: boolean
    }) => submitOutfitFeedbackRequest(rawOutfit, liked),
    onSuccess: () => {
      toast.success(i18n.t('toasts.savedPreference'))
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })
}
