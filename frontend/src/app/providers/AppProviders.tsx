import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { SplashScreen } from '@/components/common/SplashScreen'

type AppProvidersProps = {
  children?: ReactNode
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      theme="dark"
      toastOptions={{ className: 'font-sans' }}
    />
  )
}

function DocumentHeadSync() {
  const { t, i18n } = useTranslation()
  useEffect(() => {
    document.title = t('app.documentTitle')
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', t('app.metaDescription'))
    }
  }, [t, i18n.language])
  return null
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient)
  const [splashDone, setSplashDone] = useState(false)
  const handleSplashComplete = useCallback(() => setSplashDone(true), [])

  return (
    <QueryClientProvider client={queryClient}>
      <DocumentHeadSync />
      {!splashDone ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : (
        (children ?? <RouterProvider router={router} />)
      )}
      <AppToaster />
    </QueryClientProvider>
  )
}
