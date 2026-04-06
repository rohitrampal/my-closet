/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** Same Razorpay Key Id as the dashboard (public). */
  readonly VITE_RAZORPAY_KEY_ID?: string
  /** Shown on /contact and for Razorpay-style merchant contact expectations. */
  readonly VITE_PUBLIC_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
