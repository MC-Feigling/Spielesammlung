import { useSettingsStore } from '~/stores/settings'

export type SoundName = 'dice' | 'match' | 'hit' | 'win' | 'start'

export function useSound() {
  const settings = useSettingsStore()

  function play(name: SoundName) {
    if (!import.meta.client || !settings.soundEnabled) return

    const audio = new Audio(`/sounds/${name}.wav`)
    void audio.play().catch(() => {})
  }

  return { play }
}
