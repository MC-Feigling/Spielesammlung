<script setup lang="ts">
import { AVATARS, type AvatarId } from '~/constants/avatars'
import type { Profile } from '~/types/profile'

const profilesStore = useProfilesStore()

const newName = ref('')
const newAvatarId = ref<AvatarId>(AVATARS[0].id)
const editingProfileId = ref<string | null>(null)
const editingName = ref('')
const editingAvatarId = ref<AvatarId>(AVATARS[0].id)
const formError = ref('')

function totalWins(profile: Profile): number {
  return Object.values(profile.wins).reduce<number>((total, count) => total + (count ?? 0), 0)
}

function createProfile() {
  formError.value = ''

  try {
    profilesStore.createProfile({
      name: newName.value,
      avatarId: newAvatarId.value,
    })
    newName.value = ''
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Profil konnte nicht angelegt werden'
  }
}

function startEditing(profile: Profile) {
  formError.value = ''
  editingProfileId.value = profile.id
  editingName.value = profile.name
  editingAvatarId.value = profile.avatarId as AvatarId
}

function cancelEditing() {
  editingProfileId.value = null
  editingName.value = ''
  editingAvatarId.value = AVATARS[0].id
}

function saveProfile() {
  if (!editingProfileId.value) return

  formError.value = ''

  try {
    profilesStore.updateProfile(editingProfileId.value, {
      name: editingName.value,
      avatarId: editingAvatarId.value,
    })
    cancelEditing()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Profil konnte nicht gespeichert werden'
  }
}
</script>

<template>
  <section aria-labelledby="profiles-heading" class="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <div class="rounded-3xl bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c] sm:p-7">
      <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Mitspieler</p>
      <h1 id="profiles-heading" class="mt-2 font-[var(--font-display)] text-4xl font-semibold">Neues Profil</h1>
      <p class="mt-3 leading-relaxed">Wähle einen Namen und ein Tier für deinen Spielplatz.</p>

      <form class="mt-6 space-y-6" @submit.prevent="createProfile">
        <label class="block">
          <span class="mb-2 block font-bold">Name</span>
          <input
            v-model="newName"
            type="text"
            name="profile-name"
            maxlength="40"
            autocomplete="off"
            class="min-h-[var(--hit-min)] w-full rounded-xl border-2 border-[#c48a4a] bg-white px-4 text-[var(--color-ink)] shadow-inner outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[#f4ba9f]"
            placeholder="Wie heißt du?"
          >
        </label>

        <AvatarPicker v-model="newAvatarId" />

        <p v-if="formError" role="alert" class="rounded-xl bg-[#ffe2d6] px-4 py-3 font-bold text-[#8e2f1a]">
          {{ formError }}
        </p>

        <AppButton type="submit" block>Profil anlegen</AppButton>
      </form>
    </div>

    <div>
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Eure Runde</p>
          <h2 class="mt-2 font-[var(--font-display)] text-3xl font-semibold">Vorhandene Profile</h2>
        </div>
        <span class="rounded-full bg-[#dceddc] px-3 py-1 font-bold text-[#27462f]">{{ profilesStore.profiles.length }}</span>
      </div>

      <div v-if="profilesStore.profiles.length === 0" class="mt-5 rounded-3xl border-2 border-dashed border-[#c48a4a] bg-white/45 p-8 text-center">
        <span class="text-4xl" aria-hidden="true">🐾</span>
        <p class="mt-3 font-[var(--font-display)] text-xl font-semibold">Noch ist niemand dabei.</p>
        <p class="mt-1">Lege links das erste Profil an.</p>
      </div>

      <ul v-else class="mt-5 space-y-4" aria-label="Vorhandene Profile">
        <li
          v-for="profile in profilesStore.profiles"
          :key="profile.id"
          class="rounded-3xl bg-[#fff6e8] p-4 shadow-[0_4px_0_#c48a4a] ring-2 ring-[#dfbd8c]"
        >
          <form v-if="editingProfileId === profile.id" class="space-y-5" @submit.prevent="saveProfile">
            <label class="block">
              <span class="mb-2 block font-bold">Name ändern</span>
              <input
                v-model="editingName"
                type="text"
                maxlength="40"
                autocomplete="off"
                class="min-h-[var(--hit-min)] w-full rounded-xl border-2 border-[#c48a4a] bg-white px-4 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[#f4ba9f]"
              >
            </label>
            <AvatarPicker v-model="editingAvatarId" />
            <div class="flex flex-wrap gap-3">
              <AppButton type="submit">Speichern</AppButton>
              <AppButton type="button" variant="ghost" @click="cancelEditing">Abbrechen</AppButton>
            </div>
          </form>

          <div v-else class="flex items-center gap-4">
            <img
              :src="AVATARS.find((avatar) => avatar.id === profile.avatarId)?.src"
              :alt="`${profile.name}: ${AVATARS.find((avatar) => avatar.id === profile.avatarId)?.label ?? 'Avatar'}`"
              class="h-16 w-16 rounded-2xl bg-[#ffe1a8] p-1"
            >
            <div class="min-w-0 flex-1">
              <h3 class="truncate font-[var(--font-display)] text-2xl font-semibold">{{ profile.name }}</h3>
              <p class="mt-1 text-sm font-bold text-[#5d4936]">{{ totalWins(profile) }} Siege</p>
            </div>
            <AppButton type="button" variant="ghost" @click="startEditing(profile)">Ändern</AppButton>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
