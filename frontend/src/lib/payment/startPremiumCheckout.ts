import { fetchCurrentUser } from '@/lib/api/auth'
import { createPremiumOrder, verifyPremiumPayment } from '@/lib/api/payment'
import type { RazorpaySuccessResponse } from '@/types/razorpay'

export const RAZORPAY_USER_CLOSED = 'RAZORPAY_USER_CLOSED'

export function isRazorpayUserClosed(err: unknown): boolean {
  return err instanceof Error && err.message === RAZORPAY_USER_CLOSED
}

/**
 * Creates a server order, opens Razorpay Checkout, verifies payment, refetches ``/auth/me``.
 */
export function startPremiumCheckout(userEmail?: string): Promise<void> {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()
  if (!key) {
    return Promise.reject(new Error('MISSING_RAZORPAY_KEY'))
  }
  const Razorpay = window.Razorpay
  if (!Razorpay) {
    return Promise.reject(new Error('RAZORPAY_SCRIPT_MISSING'))
  }

  return new Promise((resolve, reject) => {
    let settled = false

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    void (async () => {
      let order
      try {
        order = await createPremiumOrder()
      } catch (e) {
        finish(() => reject(e))
        return
      }

      const rzp = new Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'My Closet',
        description: 'Premium Upgrade',
        order_id: order.order_id,
        prefill: userEmail ? { email: userEmail } : undefined,
        handler(response: RazorpaySuccessResponse) {
          void (async () => {
            try {
              await verifyPremiumPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
              await fetchCurrentUser()
              finish(() => resolve())
            } catch (e) {
              finish(() => reject(e))
            }
          })()
        },
        modal: {
          ondismiss() {
            finish(() => reject(new Error(RAZORPAY_USER_CLOSED)))
          },
        },
      })

      rzp.open()
    })()
  })
}
