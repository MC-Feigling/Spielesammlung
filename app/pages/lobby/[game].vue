<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { GAMES, isGameId } from '~/constants/games'
import { isConnectFourRosterValid } from '~/features/games/connectFour/lobby'
import { isMuehleRosterValid } from '~/features/games/muehle/lobby'
import { isRacingRosterValid } from '~/features/games/racing/lobby'
import { isUnoRosterValid } from '~/features/games/uno/lobby'
import type { AiDifficulty } from '~/features/games/shared/ai'
import type { GameId } from '~/types/game'
import type { SessionPlayerInput } from '~/stores/session'

const route = useRoute()
const session = useSessionStore()
const profilesStore = useProfilesStore()

const routeGame = Array.isArray(route.params.game) ? route.params.game[0] : route.params.game
const gameId = computed<GameId | null>(() => (typeof routeGame === 'string' && isGameId(routeGame) ? routeGame : null))
const game = computed(() => GAMES.find((item) => item.id === gameId.value))

const canStart = computed(() => {
  if (!session.canBegin) return false
  if (routeGame === 'racing') {
    return isRacingRosterValid(session.players)
  }
  if (routeGame === 'uno') {
    return isUnoRosterValid(session.players)
  }
  if (routeGame === 'connectFour') {
    return isConnectFourRosterValid(session.players)
  }
  if (routeGame === 'muehle') {
    return isMuehleRosterValid(session.players)
  }
  return true
})

const hasAi = computed(() => session.players.some((player) => player.type === 'ai'))

const lobbyHint = computed(() => {
  if (canStart.value) return 'Die Runde kann starten!'
  if (routeGame === 'racing' && session.canBegin && !isRacingRosterValid(session.players)) {
    return 'Maximal 2 Menschen und 2 KI.'
  }
  if (routeGame === 'uno' && session.canBegin && !isUnoRosterValid(session.players)) {
    return 'Genau 1 Mensch und 1–3 KI.'
  }
  if (routeGame === 'connectFour' && session.canBegin && !isConnectFourRosterValid(session.players)) {
    return 'Genau 2 Plätze besetzen.'
  }
  if (routeGame === 'muehle' && session.canBegin && !isMuehleRosterValid(session.players)) {
    return 'Genau 2 Plätze besetzen.'
  }
  return 'Mindestens zwei besetzte Plätze auswählen.'
})

if (!gameId.value) {
  void navigateTo('/')
}

onMounted(() => {
  if (gameId.value) {
    session.startLobby(gameId.value)
  }
})

function profilesForSeat(seatIndex: number) {
  const assignedProfileIds = new Set(
    session.seats
      .filter((player) => player?.type === 'human' && player.seatIndex !== seatIndex)
      .map((player) => player?.profileId),
  )

  return profilesStore.profiles.filter((profile) => !assignedProfileIds.has(profile.id))
}

function setPlayer(seatIndex: number, player: SessionPlayerInput | null) {
  session.setSeat(seatIndex, player)
}

function setSeatCount(event: Event) {
  session.setSeatCount(Number((event.target as HTMLSelectElement).value))
}

function setMemoryGridSize(event: Event) {
  session.setMemoryGridSize((event.target as HTMLSelectElement).value as '4x3' | '4x4')
}

function setAiDifficulty(event: Event) {
  session.setAiDifficulty((event.target as HTMLSelectElement).value as AiDifficulty)
}

function startGame() {
  session.beginPlay()
}

function leaveLobby() {
  session.endSession()
}
</script>

<template>
  <section v-if="game" aria-labelledby="lobby-heading" class="mx-auto max-w-3xl">
    <NuxtLink
      to="/"
      class="inline-flex min-h-[var(--hit-min)] items-center font-bold text-[var(--color-felt)] underline decoration-2 underline-offset-4 focus-visible:outline-4 focus-visible:outline-[var(--color-accent)]"
      @click="leaveLobby"
    >
      ← Zurück zur Spielauswahl
    </NuxtLink>

    <div class="mt-5 rounded-3xl bg-[var(--color-panel)] p-6 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
      <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde vorbereiten</p>
      <h1 id="lobby-heading" class="mt-2 font-[var(--font-display)] text-4xl font-semibold sm:text-5xl">
        {{ game.title }}
      </h1>
      <p class="mt-3 text-[var(--text-base)]">{{ game.blurb }}</p>

      <label class="mt-6 block max-w-xs text-sm font-bold" for="seat-count">
        Wie viele Plätze?
      </label>
      <select
        id="seat-count"
        class="mt-1 min-h-[var(--hit-min)] w-full max-w-xs rounded-2xl border-2 border-[#c48a4a] bg-white px-4 font-bold focus:outline-4 focus:outline-offset-2 focus:outline-[var(--color-accent)]"
        :value="session.seatCount"
        @change="setSeatCount"
      >
        <option :value="2">2 Plätze</option>
        <option :value="3">3 Plätze</option>
        <option :value="4">4 Plätze</option>
      </select>

      <template v-if="gameId === 'memory'">
        <label class="mt-6 block max-w-xs text-sm font-bold" for="memory-grid-size">
          Wie groß soll das Memory sein?
        </label>
        <select
          id="memory-grid-size"
          class="mt-1 min-h-[var(--hit-min)] w-full max-w-xs rounded-2xl border-2 border-[#c48a4a] bg-white px-4 font-bold focus:outline-4 focus:outline-offset-2 focus:outline-[var(--color-accent)]"
          :value="session.memoryGridSize"
          @change="setMemoryGridSize"
        >
          <option value="4x3">Klein – 12 Karten</option>
          <option value="4x4">Groß – 16 Karten</option>
        </select>
      </template>
    </div>

    <div v-if="hasAi" class="mt-6 rounded-3xl bg-[#dceddc] p-4 text-[#27462f]">
      <label class="block text-sm font-bold" for="ai-difficulty">
        Schwierigkeitsgrad (KI)
      </label>
      <select
        id="ai-difficulty"
        class="mt-2 min-h-[var(--hit-min)] w-full rounded-2xl border-2 border-[#c48a4a] bg-white px-4 font-bold focus:outline-4 focus:outline-offset-2 focus:outline-[var(--color-accent)]"
        :value="session.aiDifficulty"
        @change="setAiDifficulty"
      >
        <option value="easy">Leicht</option>
        <option value="medium">Mittel</option>
        <option value="hard">Schwer</option>
      </select>
      <p class="mt-2 text-xs font-bold text-[#7a5a3a]">
        Gilt für alle Robo-Spieler dieser Runde.
      </p>
    </div>

    <div class="mt-7 grid gap-5 sm:grid-cols-2">
      <PlayerSeat
        v-for="(player, seatIndex) in session.seats"
        :key="seatIndex"
        :seat-index="seatIndex"
        :player="player"
        :profiles="profilesForSeat(seatIndex)"
        @update:player="setPlayer(seatIndex, $event)"
      />
    </div>

    <div class="mt-7 rounded-3xl bg-[#dceddc] p-5 text-[#27462f]">
      <p class="font-bold">
        {{ lobbyHint }}
      </p>
      <AppButton class="mt-4" block :disabled="!canStart" @click="startGame">
        Spiel starten
        <span aria-hidden="true">→</span>
      </AppButton>
    </div>
  </section>
</template>
