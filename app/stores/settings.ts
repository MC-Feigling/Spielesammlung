import { STORAGE_SETTINGS } from '~/constants/storage'
import { DEFAULT_PARENTAL, normalizeParental } from '~/features/parental/normalize'
import { localDayKey } from '~/features/parental/playtime'
import type { UiScale } from '~/types/game'
import type { ParentalControls, Settings } from '~/types/profile'

const DEFAULTS: Settings = {
  soundEnabled: true,
  uiScale: 'large',
  parental: { ...DEFAULT_PARENTAL },
}

function load(): Settings {
  if (!import.meta.client) return { ...DEFAULTS, parental: { ...DEFAULT_PARENTAL } }

  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS)
    if (!raw) return { ...DEFAULTS, parental: { ...DEFAULT_PARENTAL } }

    const parsed = JSON.parse(raw) as Partial<Settings>
    const settings: Settings = {
      soundEnabled: true,
      uiScale: 'large',
      parental: normalizeParental(parsed.parental),
    }

    if (typeof parsed.soundEnabled === 'boolean') {
      settings.soundEnabled = parsed.soundEnabled
    }

    if (parsed.uiScale === 'large' || parsed.uiScale === 'compact') {
      settings.uiScale = parsed.uiScale
    }

    return settings
  } catch {
    return { ...DEFAULTS, parental: { ...DEFAULT_PARENTAL } }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = load()
  const soundEnabled = ref(initial.soundEnabled)
  const uiScale = ref<UiScale>(initial.uiScale)
  const parental = ref<ParentalControls>(initial.parental)

  const isParentalActive = computed(() => parental.value.pinHash !== null)

  function persist() {
    if (!import.meta.client) return

    const payload: Settings = {
      soundEnabled: soundEnabled.value,
      uiScale: uiScale.value,
      parental: parental.value,
    }
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(payload))
    document.documentElement.dataset.uiScale = uiScale.value
  }

  function ensureDayRollover(now: Date = new Date()) {
    const today = localDayKey(now)
    if (parental.value.dayKey === today) return

    parental.value = {
      ...parental.value,
      dayKey: today,
      usedMsToday: 0,
      extraMsToday: 0,
    }
    persist()
  }

  function hydrate() {
    const settings = load()
    soundEnabled.value = settings.soundEnabled
    uiScale.value = settings.uiScale
    parental.value = settings.parental
    ensureDayRollover()

    if (import.meta.client) {
      document.documentElement.dataset.uiScale = uiScale.value
    }
  }

  function setSoundEnabled(value: boolean) {
    soundEnabled.value = value
    persist()
  }

  function setUiScale(value: UiScale) {
    uiScale.value = value
    persist()
  }

  // Eager client init so pinHash is available before first paint/interaction.
  if (import.meta.client) {
    ensureDayRollover()
    document.documentElement.dataset.uiScale = uiScale.value
  }

  function setParentalPinHash(hash: string) {
    parental.value = { ...parental.value, pinHash: hash }
    ensureDayRollover()
    persist()
  }

  function setDailyLimitMinutes(minutes: number) {
    const next = Math.min(240, Math.max(5, Math.round(minutes)))
    parental.value = { ...parental.value, dailyLimitMinutes: next }
    persist()
  }

  function addExtraMsToday(ms: number) {
    ensureDayRollover()
    parental.value = {
      ...parental.value,
      extraMsToday: parental.value.extraMsToday + Math.max(0, ms),
    }
    persist()
  }

  function resetUsedToday() {
    ensureDayRollover()
    parental.value = {
      ...parental.value,
      usedMsToday: 0,
      extraMsToday: 0,
    }
    persist()
  }

  function addUsedMs(ms: number) {
    if (!isParentalActive.value || ms <= 0) return
    ensureDayRollover()
    parental.value = {
      ...parental.value,
      usedMsToday: parental.value.usedMsToday + ms,
    }
    persist()
  }

  return {
    soundEnabled,
    uiScale,
    parental,
    isParentalActive,
    hydrate,
    setSoundEnabled,
    setUiScale,
    ensureDayRollover,
    setParentalPinHash,
    setDailyLimitMinutes,
    addExtraMsToday,
    resetUsedToday,
    addUsedMs,
  }
})
