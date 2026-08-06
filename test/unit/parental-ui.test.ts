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
  'app/constants/parental.ts',
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
    expect(layout).toContain('onParentalRecovered')
  })

  it('exposes super-pin recovery in parental dialogs', () => {
    const settings = readSource('app/components/parental/ParentalSettingsDialog.vue')
    const unlock = readSource('app/components/parental/ParentalUnlockDialog.vue')
    const parentalConst = readSource('app/constants/parental.ts')

    expect(parentalConst).toContain('PARENTAL_SUPER_PIN')
    expect(settings).toContain('PIN vergessen?')
    expect(settings).toContain('clearParentalControls')
    expect(settings).toContain('verifyParentalAccess')
    expect(unlock).toContain('PIN vergessen?')
    expect(unlock).toContain('clearParentalControls')
    expect(unlock).toContain('recovered')
  })
})
