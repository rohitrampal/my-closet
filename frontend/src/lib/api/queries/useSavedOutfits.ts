import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/errors'
import {
  deleteSavedOutfitRequest,
  fetchSavedOutfitsRequest,
  saveOutfitRequest,
} from '@/lib/api/outfit'
import { i18n } from '@/lib/i18n/config'

export const savedOutfitsQueryKey = ['saved-outfits'] as const

export function useSavedOutfitsQuery() {
  return useQuery({
    queryKey: savedOutfitsQueryKey,
    queryFn: fetchSavedOutfitsRequest,
  })
}

export function useSaveOutfitMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveOutfitRequest,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: savedOutfitsQueryKey })
      toast.success(i18n.t('toasts.outfitSaved'))
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })
}

export function useDeleteSavedOutfitMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSavedOutfitRequest,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: savedOutfitsQueryKey })
      toast.success(i18n.t('toasts.savedOutfitDeleted'))
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })
}
