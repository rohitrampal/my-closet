import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClothes, deleteClothes, fetchClothes } from '@/lib/api/clothes'
import { getErrorMessage } from '@/lib/api/errors'
import type { ClothesItem } from '@/lib/api/types'
import { i18n } from '@/lib/i18n/config'

export const clothesQueryKey = ['clothes'] as const

export function useClothesQuery() {
  return useQuery({
    queryKey: clothesQueryKey,
    queryFn: fetchClothes,
  })
}

export function useCreateClothesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClothes,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clothesQueryKey })
      toast.success(i18n.t('toasts.clothesCreated'))
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })
}

export function useDeleteClothesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClothes,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: clothesQueryKey })
      const previous = queryClient.getQueryData<ClothesItem[]>(clothesQueryKey)
      queryClient.setQueryData<ClothesItem[]>(
        clothesQueryKey,
        (old) => old?.filter((item) => item.id !== id) ?? []
      )
      return { previous }
    },
    onError: (error: unknown, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(clothesQueryKey, context.previous)
      }
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success(i18n.t('toasts.clothesDeleted'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: clothesQueryKey })
    },
  })
}
