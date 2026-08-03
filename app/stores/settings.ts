import { STORAGE_SETTINGS } from '~/constants/storage'
import type { UiScale } from '~/types/game'
import type { Settings } from '~/types/profile'

const DEFAULTS: Settings = { soundEnabled: true, uiScale: 'large' }

function load(): Settings {
  if (!import.meta.client) return { ...DEFAULTS }

  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS)
    if (!raw) return { ...DEFAULTS }

    const parsed = JSON.parse(raw) as Partial<Settings>
    const settings = { ...DEFAULTS }

    if (typeof parsed.soundEnabled === 'boolean') {
      settings.soundEnabled = parsed.soundEnabled
    }

    if (parsed.uiScale === 'large' || parsed.uiScale === 'compact') {
      settings.uiScale = parsed.uiScale
    }

    return settings
  } catch {
    return { ...DEFAULTS }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const soundEnabled = ref(true)
  const uiScale = ref<UiScale>('large')

  function hydrate() {
    const settings = load()
    soundEnabled.value = settings.soundEnabled
    uiScale.value = settings.uiScale

    if (import.meta.client) {
      document.documentElement.dataset.uiScale = uiScale.value
    }
  }

  function persist() {
    if (!import.meta.client) return

    const payload: Settings = { soundEnabled: soundEnabled.value, uiScale: uiScale.value }
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(payload))
    document.documentElement.dataset.uiScale = uiScale.value
  }

  function setSoundEnabled(value: boolean) {
    soundEnabled.value = value
    persist()
  }

  function setUiScale(value: UiScale) {
    uiScale.value = value
    persist()
  }

  return { soundEnabled, uiScale, hydrate, setSoundEnabled, setUiScale }
})
