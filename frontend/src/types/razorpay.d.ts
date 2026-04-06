/** Loaded from https://checkout.razorpay.com/v1/checkout.js */

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export type RazorpayConstructorOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void }
  prefill?: { email?: string; contact?: string }
  theme?: { color?: string }
}

export type RazorpayInstance = {
  open: () => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayConstructorOptions) => RazorpayInstance
  }
}

export {}
