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
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SignupPage } from '@/pages/SignupPage'
import { OutfitPage } from '@/pages/OutfitPage'
import { ContactPage } from '@/pages/ContactPage'
import { PremiumUpgradePage } from '@/pages/PremiumUpgradePage'
import { PrivacyPage } from '@/pages/PrivacyPage'
// import { RefundsPage } from '@/pages/RefundsPage'
import { SavedOutfitsPage } from '@/pages/SavedOutfitsPage'
import { TermsPage } from '@/pages/TermsPage'
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
          {
            path: 'forgot-password',
            element: (
              <GuestOnly>
                <ForgotPasswordPage />
              </GuestOnly>
            ),
          },
          {
            path: 'reset-password',
            element: (
              <GuestOnly>
                <ResetPasswordPage />
              </GuestOnly>
            ),
          },
        ],
      },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      // { path: 'refunds', element: <RefundsPage /> },
      { path: 'contact', element: <ContactPage /> },
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
          { path: 'premium', element: <PremiumUpgradePage /> },
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
