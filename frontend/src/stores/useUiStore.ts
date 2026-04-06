import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { i18n } from '@/lib/i18n/config'

export type LanguageCode = 'en' | 'hi'

type UiState = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
}

function applyDarkTheme() {
  document.documentElement.classList.add('dark')
}

function applyDocumentLang(language: LanguageCode) {
  document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
}

applyDarkTheme()

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        applyDocumentLang(language)
        void i18n.changeLanguage(language)
        set({ language })
      },
    }),
    {
      name: 'wardrobe-ui',
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2 && persisted && typeof persisted === 'object' && persisted !== null) {
          const p = persisted as { language?: LanguageCode }
          return { language: p.language ?? 'en' }
        }
        return persisted as { language: LanguageCode }
      },
      partialize: (state) => ({
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        applyDarkTheme()
        if (!state) return
        applyDocumentLang(state.language)
        void i18n.changeLanguage(state.language)
      },
    },
  ),
)
