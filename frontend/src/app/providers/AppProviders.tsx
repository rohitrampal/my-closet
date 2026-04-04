import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { useUiStore } from '@/stores/useUiStore'

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
  const theme = useUiStore((s) => s.theme)
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      theme={theme}
      toastOptions={{ className: 'font-sans' }}
    />
  )
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children ?? <RouterProvider router={router} />}
      <AppToaster />
    </QueryClientProvider>
  )
}
