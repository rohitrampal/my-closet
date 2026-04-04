import type { NavigateFunction } from 'react-router-dom'

let navigateRef: NavigateFunction | null = null

export function setNavigate(navigate: NavigateFunction) {
  navigateRef = navigate
}

export function navigateToLogin() {
  if (navigateRef) {
    navigateRef('/login', { replace: true })
  } else {
    window.location.assign('/login')
  }
}
