export const STYLE_CHIP_PRESETS = ['casual', 'formal', 'sporty', 'party', 'ethnic'] as const

export type StyleChipPreset = (typeof STYLE_CHIP_PRESETS)[number]

export function normalizeStyleChip(value: string): string {
  return value.trim().toLowerCase()
}
