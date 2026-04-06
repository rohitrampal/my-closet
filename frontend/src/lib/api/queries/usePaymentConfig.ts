import { useQuery } from '@tanstack/react-query'
import { fetchPaymentConfig } from '@/lib/api/payment'

export function usePaymentConfig() {
  return useQuery({
    queryKey: ['payment', 'config'],
    queryFn: fetchPaymentConfig,
    staleTime: 60_000,
  })
}
