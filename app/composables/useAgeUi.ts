import { computed } from 'vue'
import { useSettingsStore } from '~/stores/settings'

export function useAgeUi() {
  const settings = useSettingsStore()

  const uiScale = computed(() => settings.uiScale)
  const isLarge = computed(() => settings.uiScale === 'large')
  const isCompact = computed(() => settings.uiScale === 'compact')

  return {
    uiScale,
    isLarge,
    isCompact,
  }
}
