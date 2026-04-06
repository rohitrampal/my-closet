/** Public contact for /contact and policy footers. Set in frontend `.env`. */
export function getPublicSupportEmail(): string | undefined {
  const v = import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL?.trim()
  return v || undefined
}
