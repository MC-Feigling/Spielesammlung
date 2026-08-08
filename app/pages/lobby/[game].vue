<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { GAMES, isGameId } from '~/constants/games'
import { isConnectFourRosterValid } from '~/features/games/connectFour/lobby'
import { isHorseRacingRosterValid } from '~/features/games/horseRacing/lobby'
import { isMuehleRosterValid } from '~/features/games/muehle/lobby'
import { isPuzzleRaceRosterValid } from '~/features/games/puzzleRace/lobby'
import {
  PUZZLE_IMAGES,
  PUZZLE_UPLOAD_ACCEPT,
  PUZZLE_UPLOAD_MAX_BYTES,
} from '~/features/games/puzzleRace/images'
import type { PuzzleGridSize } from '~/features/games/puzzleRace/engine'
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
  if (routeGame === 'horseRacing') {
    return isHorseRacingRosterValid(session.players)
  }
  if (routeGame === 'uno') {
    return isUnoRosterValid(session.players)
  }
  if (routeGame === 'puzzleRace') {
    return isPuzzleRaceRosterValid(session.players)
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
  if (routeGame === 'horseRacing' && session.canBegin && !isHorseRacingRosterValid(session.players)) {
    return '1–2 Menschen, Rest KI.'
  }
  if (routeGame === 'uno' && session.canBegin && !isUnoRosterValid(session.players)) {
    return 'Genau 1 Mensch und 1–3 KI.'
  }
  if (routeGame === 'puzzleRace' && session.canBegin && !isPuzzleRaceRosterValid(session.players)) {
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

function setPuzzleGridSize(event: Event) {
  session.setPuzzleGridSize((event.target as HTMLSelectElement).value as PuzzleGridSize)
}

function setAiDifficulty(event: Event) {
  session.setAiDifficulty((event.target as HTMLSelectElement).value as AiDifficulty)
}

const uploadError = ref<string | null>(null)

function onPuzzleUpload(event: Event) {
  uploadError.value = null
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!PUZZLE_UPLOAD_ACCEPT.split(',').includes(file.type)) {
    uploadError.value = 'Nur JPG, PNG oder WebP.'
    input.value = ''
    return
  }

  if (file.size > PUZZLE_UPLOAD_MAX_BYTES) {
    uploadError.value = 'Bild zu groß (max. 2 MB).'
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      session.setPuzzleImageDataUrl(reader.result)
    }
  }
  reader.onerror = () => {
    uploadError.value = 'Bild konnte nicht geladen werden.'
  }
  reader.readAsDataURL(file)
}

function clearPuzzleUpload() {
  session.setPuzzleImageDataUrl(null)
  uploadError.value = null
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

      <template v-if="gameId === 'puzzleRace'">
        <label class="mt-6 block max-w-xs text-sm font-bold" for="puzzle-grid-size">
          Wie groß soll das Puzzle sein?
        </label>
        <select
          id="puzzle-grid-size"
          class="mt-1 min-h-[var(--hit-min)] w-full max-w-xs rounded-2xl border-2 border-[#c48a4a] bg-white px-4 font-bold focus:outline-4 focus:outline-offset-2 focus:outline-[var(--color-accent)]"
          :value="session.puzzleGridSize"
          @change="setPuzzleGridSize"
        >
          <option value="3x3">Klein – 3×3</option>
          <option value="5x5">Mittel – 5×5</option>
          <option value="7x7">Groß – 7×7</option>
        </select>

        <p class="mt-6 text-sm font-bold">Welches Bild?</p>
        <div
          class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Puzzle-Bild"
        >
          <button
            v-for="image in PUZZLE_IMAGES"
            :key="image.id"
            type="button"
            role="radio"
            class="overflow-hidden rounded-2xl border-4 bg-white text-left shadow-[0_3px_0_#c48a4a] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            :class="session.puzzleImageId === image.id && !session.puzzleImageDataUrl
              ? 'border-[var(--color-accent)]'
              : 'border-[#dfbd8c]'"
            :aria-checked="session.puzzleImageId === image.id && !session.puzzleImageDataUrl"
            @click="session.setPuzzleImageId(image.id)"
          >
            <img :src="image.src" :alt="image.label" class="aspect-square w-full object-cover">
            <span class="block px-2 py-1 text-center text-sm font-bold">{{ image.label }}</span>
          </button>
        </div>

        <label class="mt-6 block text-sm font-bold" for="puzzle-upload">
          Oder eigenes Bild (max. 2 MB)
        </label>
        <input
          id="puzzle-upload"
          type="file"
          class="mt-2 block w-full text-sm font-bold file:mr-3 file:min-h-[var(--hit-min)] file:rounded-2xl file:border-2 file:border-[#c48a4a] file:bg-white file:px-4 file:font-bold"
          :accept="PUZZLE_UPLOAD_ACCEPT"
          @change="onPuzzleUpload"
        >
        <p v-if="session.puzzleImageDataUrl" class="mt-2 text-sm font-bold text-[var(--color-felt)]">
          Eigenes Bild aktiv.
          <button type="button" class="underline" @click="clearPuzzleUpload">Zurücksetzen</button>
        </p>
        <p v-if="uploadError" class="mt-2 text-sm font-bold text-[var(--color-accent)]">
          {{ uploadError }}
        </p>
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
