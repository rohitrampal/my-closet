import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { i18n } from '@/lib/i18n/config'

export type ThemeMode = 'light' | 'dark'
export type LanguageCode = 'en' | 'hi'

type UiState = {
  theme: ThemeMode
  language: LanguageCode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLanguage: (language: LanguageCode) => void
}

function applyThemeClass(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function applyDocumentLang(language: LanguageCode) {
  document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'en',
      setTheme: (theme) => {
        applyThemeClass(theme)
        set({ theme })
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        applyThemeClass(next)
        set({ theme: next })
      },
      setLanguage: (language) => {
        applyDocumentLang(language)
        void i18n.changeLanguage(language)
        set({ language })
      },
    }),
    {
      name: 'wardrobe-ui',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        applyThemeClass(state.theme)
        applyDocumentLang(state.language)
        void i18n.changeLanguage(state.language)
      },
    }
  )
)
