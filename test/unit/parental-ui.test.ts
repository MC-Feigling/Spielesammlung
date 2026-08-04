import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PARENTAL_FILES = [
  'app/components/parental/PlaytimeLockOverlay.vue',
  'app/components/parental/ParentalSetupDialog.vue',
  'app/components/parental/ParentalUnlockDialog.vue',
  'app/components/parental/ParentalSettingsDialog.vue',
  'app/composables/usePlaytimeGuard.ts',
  'app/features/parental/playtime.ts',
  'app/features/parental/normalize.ts',
  'app/utils/pin.ts',
] as const

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('parental shell', () => {
  it('provides parental files', () => {
    for (const file of PARENTAL_FILES) {
      expect(existsSync(resolve(process.cwd(), file))).toBe(true)
    }
  })

  it('wires Jugendschutz into the default layout', () => {
    const layout = readSource('app/layouts/default.vue')
    expect(layout).toContain('Jugendschutz')
    expect(layout).toContain('PlaytimeLockOverlay')
    expect(layout).toContain('usePlaytimeGuard')
  })
})
