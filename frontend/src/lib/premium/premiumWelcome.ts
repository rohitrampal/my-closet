/** One-time banner after a user becomes Premium (per browser). */
export const SEEN_PREMIUM_WELCOME_KEY = 'seen_premium_welcome'

export function hasSeenPremiumWelcome(): boolean {
  try {
    return localStorage.getItem(SEEN_PREMIUM_WELCOME_KEY) === 'true'
  } catch {
    return true
  }
}

export function markPremiumWelcomeSeen(): void {
  try {
    localStorage.setItem(SEEN_PREMIUM_WELCOME_KEY, 'true')
  } catch {
    /* ignore */
  }
}
