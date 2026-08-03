import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_SHELL_FILES = [
  'app/components/ui/AppButton.vue',
  'app/components/ui/AvatarPicker.vue',
  'app/components/ui/SoundToggle.vue',
  'app/components/ui/UiScaleToggle.vue',
  'app/components/hub/GameCard.vue',
  'app/layouts/default.vue',
  'app/pages/index.vue',
  'app/pages/profiles.vue',
  'public/avatars/bear.svg',
  'public/avatars/fox.svg',
  'public/avatars/owl.svg',
  'public/avatars/frog.svg',
  'public/avatars/cat.svg',
  'public/avatars/dog.svg',
] as const

describe('app shell', () => {
  it('provides every hub, profile, and avatar asset', () => {
    for (const file of APP_SHELL_FILES) {
      expect(existsSync(resolve(process.cwd(), file))).toBe(true)
    }
  })
})
