import { createBrowserRouter, Navigate } from 'react-router-dom'
import { GuestOnly } from '@/components/auth/GuestOnly'
import { HomeRedirect } from '@/components/auth/HomeRedirect'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { RootLayout } from '@/components/layout/RootLayout'
import { AdminPage } from '@/pages/AdminPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { OutfitPage } from '@/pages/OutfitPage'
import { SavedOutfitsPage } from '@/pages/SavedOutfitsPage'
import { UploadPage } from '@/pages/UploadPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        element: <AuthLayout />,
        children: [
          {
            path: 'login',
            element: (
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            ),
          },
          {
            path: 'signup',
            element: (
              <GuestOnly>
                <SignupPage />
              </GuestOnly>
            ),
          },
        ],
      },
      {
        path: 'dashboard',
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'upload', element: <UploadPage /> },
        ],
      },
      {
        path: 'outfit',
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [{ index: true, element: <OutfitPage /> }],
      },
      {
        path: 'saved-outfits',
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [{ index: true, element: <SavedOutfitsPage /> }],
      },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireAdmin>
              <AppShell />
            </RequireAdmin>
          </RequireAuth>
        ),
        children: [{ index: true, element: <AdminPage /> }],
      },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])
