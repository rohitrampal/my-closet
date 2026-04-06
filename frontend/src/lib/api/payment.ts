import { apiClient } from '@/lib/api/client'

export type PaymentConfigResponse = {
  price: number
  mode: 'test' | 'prod' | string
}

export type PaymentCreateOrderResponse = {
  order_id: string
  amount: number
  currency: string
}

export type PaymentVerifyBody = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export async function fetchPaymentConfig(): Promise<PaymentConfigResponse> {
  const { data } = await apiClient.get<PaymentConfigResponse>('/payment/config')
  return data
}

export async function createPremiumOrder(): Promise<PaymentCreateOrderResponse> {
  const { data } = await apiClient.post<PaymentCreateOrderResponse>('/payment/create-order', {})
  return data
}

export async function verifyPremiumPayment(body: PaymentVerifyBody): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<{ success: boolean }>('/payment/verify', body)
  return data
}
