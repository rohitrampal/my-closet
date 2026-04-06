/** One-time celebratory banner after the user's first premium outfit generation (per browser). */
export const SEEN_PREMIUM_WOW_KEY = 'seen_premium_wow'

export function hasSeenPremiumWow(): boolean {
  try {
    return localStorage.getItem(SEEN_PREMIUM_WOW_KEY) === 'true'
  } catch {
    return true
  }
}

export function markPremiumWowSeen(): void {
  try {
    localStorage.setItem(SEEN_PREMIUM_WOW_KEY, 'true')
  } catch {
    /* ignore quota / private mode */
  }
}
