import type { Config } from 'tailwindcss'

/**
 * Tailwind v4 primary configuration lives in `src/index.css` (`@theme`, imports).
 * This file documents the project and helps tooling that expects a config path.
 * Semantic colors map to CSS variables defined in `src/styles/theme.css`.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
} satisfies Config
