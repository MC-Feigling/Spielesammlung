import { STORAGE_PROFILES } from '~/constants/storage'
import { withWin } from '~/features/profiles/wins'
import type { GameId } from '~/types/game'
import type { Profile } from '~/types/profile'

function loadProfiles(): Profile[] {
  if (!import.meta.client) return []

  try {
    const raw = localStorage.getItem(STORAGE_PROFILES)
    if (!raw) return []

    return JSON.parse(raw) as Profile[]
  } catch {
    return []
  }
}

function saveProfiles(profiles: Profile[]) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_PROFILES, JSON.stringify(profiles))
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<Profile[]>([])

  function hydrate() {
    profiles.value = loadProfiles()
  }

  function createProfile(input: { name: string; avatarId: string }): Profile {
    const name = input.name.trim()
    if (!name) throw new Error('Name erforderlich')

    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      avatarId: input.avatarId,
      wins: {},
      createdAt: new Date().toISOString(),
    }

    profiles.value = [...profiles.value, profile]
    saveProfiles(profiles.value)
    return profile
  }

  function updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'avatarId' | 'favoriteGameId'>>) {
    profiles.value = profiles.value.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile))
    saveProfiles(profiles.value)
  }

  function recordWin(profileId: string, gameId: GameId) {
    profiles.value = profiles.value.map((profile) => (
      profile.id === profileId ? withWin(profile, gameId) : profile
    ))
    saveProfiles(profiles.value)
  }

  return { profiles, hydrate, createProfile, updateProfile, recordWin }
})
