<script setup lang="ts">
import { computed } from 'vue'
import type { Profile } from '~/types/profile'
import type { SessionPlayer } from '~/types/game'
import type { SessionPlayerInput, SessionSeat } from '~/stores/session'

type SeatMode = 'empty' | 'human' | 'ai'

const props = defineProps<{
  seatIndex: number
  player: SessionSeat
  profiles: Profile[]
}>()

const emit = defineEmits<{
  'update:player': [player: SessionPlayerInput | null]
}>()

const AI_NAMES = ['Robo-Bär', 'Robo-Fuchs', 'Robo-Eule', 'Robo-Frosch'] as const
const AI_AVATARS = ['bear', 'fox', 'owl', 'frog'] as const

const seatLabel = computed(() => `Platz ${props.seatIndex + 1}`)
const selectedProfileId = computed(() => props.player?.type === 'human' ? props.player.profileId ?? '' : '')

function setHumanPlayer(profileId: string) {
  const profile = props.profiles.find((item) => item.id === profileId)
  if (!profile) {
    emit('update:player', null)
    return
  }

  emit('update:player', {
    type: 'human',
    profileId: profile.id,
    displayName: profile.name,
    avatarId: profile.avatarId,
  })
}

function setAiPlayer() {
  emit('update:player', {
    type: 'ai',
    displayName: AI_NAMES[props.seatIndex],
    avatarId: AI_AVATARS[props.seatIndex],
  })
}

function handleModeChange(event: Event) {
  const mode = (event.target as HTMLSelectElement).value as SeatMode

  if (mode === 'empty') {
    emit('update:player', null)
    return
  }

  if (mode === 'ai') {
    setAiPlayer()
    return
  }

  setHumanPlayer(props.profiles[0]?.id ?? '')
}

function handleProfileChange(event: Event) {
  setHumanPlayer((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <article class="rounded-3xl border-2 border-[#dfbd8c] bg-[var(--color-panel)] p-5 shadow-[0_4px_0_#c48a4a]">
    <div class="flex items-center justify-between gap-3">
      <h2 class="font-[var(--font-display)] text-xl font-semibold">{{ seatLabel }}</h2>
      <span
        class="rounded-full px-3 py-1 text-sm font-bold"
        :class="player ? 'bg-[#dceddc] text-[#27462f]' : 'bg-[#f3e7d3] text-[#725632]'"
      >
        {{ player ? player.type === 'human' ? 'Kind' : 'Robo' : 'Frei' }}
      </span>
    </div>

    <label class="mt-4 block text-sm font-bold" :for="`seat-mode-${seatIndex}`">
      Wer spielt hier?
    </label>
    <select
      :id="`seat-mode-${seatIndex}`"
      class="mt-1 min-h-[var(--hit-min)] w-full rounded-2xl border-2 border-[#c48a4a] bg-white px-4 font-bold focus:outline-4 focus:outline-offset-2 focus:outline-[var(--color-accent)]"
      :value="player?.type ?? 'empty'"
      @change="handleModeChange"
    >
      <option value="empty">Platz frei</option>
      <option value="human" :disabled="profiles.length === 0">Kind</option>
      <option value="ai">Robo</option>
    </select>

    <template v-if="player?.type === 'human'">
      <label class="mt-4 block text-sm font-bold" :for="`seat-profile-${seatIndex}`">
        Profil auswählen
      </label>
      <select
        :id="`seat-profile-${seatIndex}`"
        class="mt-1 min-h-[var(--hit-min)] w-full rounded-2xl border-2 border-[#c48a4a] bg-white px-4 font-bold focus:outline-4 focus:outline-offset-2 focus:outline-[var(--color-accent)]"
        :value="selectedProfileId"
        @change="handleProfileChange"
      >
        <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
          {{ profile.name }}
        </option>
      </select>
    </template>

    <div v-if="player" class="mt-5 flex items-center gap-3 rounded-2xl bg-[#f3e7d3] p-3">
      <img class="h-12 w-12" :src="`/avatars/${player.avatarId}.svg`" alt="" aria-hidden="true">
      <p class="font-bold">{{ player.displayName }}</p>
    </div>

    <p v-else-if="profiles.length === 0" class="mt-4 text-sm leading-relaxed">
      Für ein Kind zuerst ein Profil anlegen.
    </p>
  </article>
</template>
