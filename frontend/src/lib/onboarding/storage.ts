const onboardingKey = (userId: number) => `pauua-onboarding-dismissed-${userId}`
const firstOutfitKey = (userId: number) => `pauua-first-auto-outfit-${userId}`

export function isOnboardingDismissed(userId: number): boolean {
  try {
    return localStorage.getItem(onboardingKey(userId)) === '1'
  } catch {
    return false
  }
}

export function dismissOnboarding(userId: number): void {
  try {
    localStorage.setItem(onboardingKey(userId), '1')
  } catch {
    /* ignore */
  }
}

export function hasCompletedFirstAutoOutfit(userId: number): boolean {
  try {
    return localStorage.getItem(firstOutfitKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markFirstAutoOutfitDone(userId: number): void {
  try {
    localStorage.setItem(firstOutfitKey(userId), '1')
    sessionStorage.removeItem(sessionRedirectKey(userId))
  } catch {
    /* ignore */
  }
}

const sessionRedirectKey = (userId: number) => `pauua-first-outfit-redirected-${userId}`

/** Avoids dashboard ↔ outfit redirect loops when generation fails or the user returns. */
export function hasFirstOutfitRedirectSession(userId: number): boolean {
  try {
    return sessionStorage.getItem(sessionRedirectKey(userId)) === '1'
  } catch {
    return false
  }
}

export function setFirstOutfitRedirectSession(userId: number): void {
  try {
    sessionStorage.setItem(sessionRedirectKey(userId), '1')
  } catch {
    /* ignore */
  }
}
