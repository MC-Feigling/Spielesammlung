import { useSettingsStore } from '~/stores/settings'

export type SoundName = 'dice' | 'match' | 'hit' | 'win' | 'start'

const audioCache = new Map<SoundName, HTMLAudioElement>()

export function useSound() {
  const settings = useSettingsStore()

  function play(name: SoundName) {
    if (!import.meta.client || !settings.soundEnabled) return

    let audio = audioCache.get(name)
    if (!audio) {
      audio = new Audio(`/sounds/${name}.wav`)
      audioCache.set(name, audio)
    }

    audio.currentTime = 0
    void audio.play().catch(() => {})
  }

  return { play }
}
