import { Outlet } from 'react-router-dom'
import { NavigationBridge } from '@/components/system/NavigationBridge'

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <NavigationBridge />
      <Outlet />
    </div>
  )
}
