import { Outlet } from 'react-router-dom'
import { NavigationBridge } from '@/components/system/NavigationBridge'

export function RootLayout() {
  return (
    <div className="min-h-dvh font-sans">
      <NavigationBridge />
      <Outlet />
    </div>
  )
}
