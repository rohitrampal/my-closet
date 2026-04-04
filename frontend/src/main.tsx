import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/lib/i18n/config'
import './index.css'
import { AppProviders } from '@/app/providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>
)
