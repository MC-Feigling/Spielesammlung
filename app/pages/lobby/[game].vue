<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { GAME_ICONS, GAMES, isGameId } from '~/constants/games'
import { playerColor, playerTextColor } from '~/constants/players'
import { AVATARS, type AvatarId } from '~/constants/avatars'
import {
  addAi,
  removeAt,
  restoreRoster,
  rosterFromSeats,
  rosterIndexOfProfile,
  toggleProfile,
  toLastLobby,
  type LastLobby,
} from '~/features/lobby/roster'
import { loadLastLobby, saveLastLobby } from '~/features/lobby/lastLobby'
import type { Profile } from '~/types/profile'
import { isConnectFourRosterValid } from '~/features/games/connectFour/lobby'
import { isDragonBossRosterValid } from '~/features/games/dragonBoss/lobby'
import { isHandymanRosterValid } from '~/features/games/handyman/lobby'
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
import type { MemoryGridSize } from '~/stores/session'

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
  if (routeGame === 'dragonBoss') {
    return isDragonBossRosterValid(session.players)
  }
  if (routeGame === 'handyman') {
    return isHandymanRosterValid(session.players)
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
  if (routeGame === 'dragonBoss' && session.canBegin && !isDragonBossRosterValid(session.players)) {
    return 'Genau 2 Plätze: 1–2 Menschen, Rest KI.'
  }
  if (routeGame === 'handyman' && session.canBegin && !isHandymanRosterValid(session.players)) {
    return 'Genau 1 Mensch und 1–3 KI.'
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
    lastLobby.value = loadLastLobby(gameId.value)
  }
})







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

const roster = computed(() => rosterFromSeats(session.seats))
const maxPlayers = computed(() => Math.min(4, game.value?.maxPlayers ?? 4))
const isFull = computed(() => roster.value.length >= maxPlayers.value)
const lastLobby = ref<LastLobby | null>(null)
const showNewProfile = ref(false)
const newProfileName = ref('')
const newProfileAvatar = ref<AvatarId>(AVATARS[0].id)
const newProfileError = ref('')

const DIFFICULTIES = [
  { id: 'easy', label: 'Leicht', face: '🙂' },
  { id: 'medium', label: 'Mittel', face: '😎' },
  { id: 'hard', label: 'Schwer', face: '🤖' },
] as const

function applyRoster(next: SessionPlayerInput[]) {
  const seatCount = Math.min(4, Math.max(2, next.length))
  session.setSeatCount(seatCount)
  for (let index = 0; index < seatCount; index += 1) {
    session.setSeat(index, next[index] ?? null)
  }
}

function seatOfProfile(profileId: string): number {
  return rosterIndexOfProfile(roster.value, profileId)
}

function onToggleProfile(profile: Profile) {
  applyRoster(toggleProfile(roster.value, profile, maxPlayers.value))
}

function onAddAi() {
  applyRoster(addAi(roster.value, maxPlayers.value))
}

function onRemoveAt(index: number) {
  applyRoster(removeAt(roster.value, index))
}

const aiSeats = computed(() => roster.value
  .map((player, index) => ({ player, index }))
  .filter(({ player }) => player.type === 'ai'))

function createAndSit() {
  newProfileError.value = ''
  try {
    const profile = profilesStore.createProfile({ name: newProfileName.value, avatarId: newProfileAvatar.value })
    newProfileName.value = ''
    showNewProfile.value = false
    if (!isFull.value) onToggleProfile(profile)
  } catch {
    newProfileError.value = 'Bitte einen Namen eingeben.'
  }
}

const lastLobbyRoster = computed(() => (lastLobby.value
  ? restoreRoster(lastLobby.value, profilesStore.profiles, maxPlayers.value)
  : []))

const lastLobbyLabel = computed(() => {
  const names = lastLobbyRoster.value.map((player) => (player.type === 'ai' ? 'Robo' : player.displayName))
  const robots = lastLobbyRoster.value.some((player) => player.type === 'ai')
  const difficulty = DIFFICULTIES.find((entry) => entry.id === lastLobby.value?.aiDifficulty)
  return `${names.join(' + ')}${robots && difficulty ? ` (${difficulty.label.toLowerCase()})` : ''}`
})

function applyLastLobby() {
  const last = lastLobby.value
  if (!last) return
  applyRoster(lastLobbyRoster.value)
  if (last.aiDifficulty === 'easy' || last.aiDifficulty === 'medium' || last.aiDifficulty === 'hard') {
    session.setAiDifficulty(last.aiDifficulty)
  }
  if (gameId.value === 'memory' && (last.memoryGridSize === '4x3' || last.memoryGridSize === '4x4')) {
    session.setMemoryGridSize(last.memoryGridSize)
  }
  if (gameId.value === 'puzzleRace') {
    if (last.puzzleGridSize === '3x3' || last.puzzleGridSize === '5x5' || last.puzzleGridSize === '7x7') {
      session.setPuzzleGridSize(last.puzzleGridSize as PuzzleGridSize)
    }
    if (last.puzzleImageId && PUZZLE_IMAGES.some((image) => image.id === last.puzzleImageId)) {
      session.setPuzzleImageId(last.puzzleImageId)
    }
  }
  if (canStart.value) startGame()
}

function startGame() {
  if (!canStart.value || !gameId.value) return
  saveLastLobby(gameId.value, toLastLobby(roster.value, {
    aiDifficulty: session.aiDifficulty,
    memoryGridSize: session.memoryGridSize,
    puzzleGridSize: session.puzzleGridSize,
    puzzleImageId: session.puzzleImageDataUrl ? undefined : session.puzzleImageId,
  }))
  session.beginPlay()
}

const MEMORY_SIZES: Array<{ id: MemoryGridSize; label: string; cols: number; cards: number }> = [
  { id: '4x3', label: 'Klein · 12 Karten', cols: 3, cards: 6 },
  { id: '4x4', label: 'Groß · 16 Karten', cols: 4, cards: 8 },
]

const PUZZLE_SIZES: Array<{ id: PuzzleGridSize; label: string; n: number }> = [
  { id: '3x3', label: 'Klein · 3×3', n: 3 },
  { id: '5x5', label: 'Mittel · 5×5', n: 5 },
  { id: '7x7', label: 'Groß · 7×7', n: 7 },
]

function leaveLobby() {
  session.endSession()
}
</script>

<template>
  <section v-if="game" aria-labelledby="lobby-heading" class="mx-auto max-w-5xl">
    <NuxtLink
      to="/"
      class="inline-flex min-h-[var(--hit-min)] items-center font-bold text-[var(--color-felt)] underline decoration-2 underline-offset-4 focus-visible:outline-4 focus-visible:outline-[var(--color-accent)]"
      @click="leaveLobby"
    >
      ← Zurück zur Spielauswahl
    </NuxtLink>

    <div class="mt-3 rounded-[2rem] bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c] sm:p-7">
      <div class="flex flex-wrap items-center gap-4">
        <span class="grid h-16 w-16 place-items-center rounded-2xl bg-[#ffe1a8] text-4xl" aria-hidden="true">
          {{ gameId ? GAME_ICONS[gameId] : '' }}
        </span>
        <div class="min-w-0 flex-1">
          <h1 id="lobby-heading" class="font-[var(--font-display)] text-4xl font-semibold">{{ game.title }}</h1>
          <p class="font-bold text-[#6b4f3a]">{{ game.blurb }}</p>
        </div>
        <AppButton
          v-if="lastLobbyRoster.length >= 2"
          variant="ghost"
          class="text-sm"
          @click="applyLastLobby"
        >
          <span aria-hidden="true">⚡</span> Wie letztes Mal: {{ lastLobbyLabel }}
        </AppButton>
      </div>

      <h2 class="mt-6 text-lg font-extrabold">
        Wer spielt mit?
        <span class="text-sm font-bold text-[#6b4f3a]">
          Antippen zum Hinsetzen ({{ game.minPlayers === game.maxPlayers ? game.maxPlayers : `${game.minPlayers}–${maxPlayers}` }})
        </span>
      </h2>

      <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          v-for="profile in profilesStore.profiles"
          :key="profile.id"
          type="button"
          class="lobby-tile"
          :class="{ 'is-selected': seatOfProfile(profile.id) >= 0 }"
          :style="seatOfProfile(profile.id) >= 0 ? { '--seat': playerColor(seatOfProfile(profile.id)) } : undefined"
          :aria-pressed="seatOfProfile(profile.id) >= 0"
          :disabled="seatOfProfile(profile.id) < 0 && isFull"
          @click="onToggleProfile(profile)"
        >
          <span
            v-if="seatOfProfile(profile.id) >= 0"
            class="seat-badge"
            :style="{ color: playerTextColor(seatOfProfile(profile.id)) }"
          >Platz {{ seatOfProfile(profile.id) + 1 }}</span>
          <span v-if="seatOfProfile(profile.id) >= 0" class="check" aria-hidden="true">✓</span>
          <PlayerAvatar :avatar-id="profile.avatarId" :size="64" />
          <span class="mt-1 block max-w-full truncate">{{ profile.name }}</span>
        </button>

        <div
          v-for="{ player, index } in aiSeats"
          :key="`ai-${index}`"
          class="lobby-tile is-selected"
          :style="{ '--seat': playerColor(index) }"
        >
          <span class="seat-badge" :style="{ color: playerTextColor(index) }">Platz {{ index + 1 }}</span>
          <button
            type="button"
            class="remove"
            :aria-label="`${player.displayName} entfernen`"
            @click="onRemoveAt(index)"
          >✕</button>
          <PlayerAvatar is-ai :color="playerColor(index)" :size="64" />
          <span class="mt-1 block max-w-full truncate">{{ player.displayName }}</span>
        </div>

        <button
          type="button"
          class="lobby-tile is-add"
          :disabled="isFull"
          @click="onAddAi"
        >
          <span class="text-4xl leading-[4rem]" aria-hidden="true">＋</span>
          <span>Roboter</span>
        </button>

        <button
          type="button"
          class="lobby-tile is-add"
          :aria-expanded="showNewProfile"
          @click="showNewProfile = !showNewProfile"
        >
          <span class="text-4xl leading-[4rem]" aria-hidden="true">＋</span>
          <span>Neues Kind</span>
        </button>
      </div>

      <form
        v-if="showNewProfile"
        class="mt-4 rounded-3xl bg-white/80 p-4 ring-2 ring-[#ecd4ae]"
        @submit.prevent="createAndSit"
      >
        <label class="block font-bold" for="lobby-new-name">Wie heißt du?</label>
        <input
          id="lobby-new-name"
          v-model="newProfileName"
          maxlength="20"
          class="mt-1 min-h-[var(--hit-min)] w-full max-w-sm rounded-2xl border-2 border-[#c48a4a] bg-white px-4 font-bold"
          autocomplete="off"
        >
        <div class="mt-3"><AvatarPicker v-model="newProfileAvatar" /></div>
        <p v-if="newProfileError" class="mt-2 font-bold text-[var(--color-accent)]" role="alert">{{ newProfileError }}</p>
        <AppButton class="mt-3" type="submit">Anlegen und hinsetzen</AppButton>
      </form>

      <div v-if="hasAi" class="mt-5">
        <h3 class="font-extrabold">Wie stark sind die Roboter?</h3>
        <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Roboter-Stärke">
          <button
            v-for="difficulty in DIFFICULTIES"
            :key="difficulty.id"
            type="button"
            role="radio"
            class="option-btn"
            :class="{ 'is-on': session.aiDifficulty === difficulty.id }"
            :aria-checked="session.aiDifficulty === difficulty.id"
            @click="session.setAiDifficulty(difficulty.id)"
          >
            <span aria-hidden="true">{{ difficulty.face }}</span> {{ difficulty.label }}
          </button>
        </div>
      </div>

      <div v-if="gameId === 'memory'" class="mt-5">
        <h3 class="font-extrabold">Wie groß?</h3>
        <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Memory-Größe">
          <button
            v-for="size in MEMORY_SIZES"
            :key="size.id"
            type="button"
            role="radio"
            class="option-btn"
            :class="{ 'is-on': session.memoryGridSize === size.id }"
            :aria-checked="session.memoryGridSize === size.id"
            @click="session.setMemoryGridSize(size.id)"
          >
            <span class="mini-grid" :style="{ gridTemplateColumns: `repeat(${size.cols}, 0.45rem)` }" aria-hidden="true">
              <i v-for="n in size.cards" :key="n" />
            </span>
            {{ size.label }}
          </button>
        </div>
      </div>

      <template v-if="gameId === 'puzzleRace'">
        <div class="mt-5">
          <h3 class="font-extrabold">Wie groß?</h3>
          <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Puzzle-Größe">
            <button
              v-for="size in PUZZLE_SIZES"
              :key="size.id"
              type="button"
              role="radio"
              class="option-btn"
              :class="{ 'is-on': session.puzzleGridSize === size.id }"
              :aria-checked="session.puzzleGridSize === size.id"
              @click="session.setPuzzleGridSize(size.id)"
            >
              <span class="mini-grid" :style="{ gridTemplateColumns: `repeat(${size.n}, 0.3rem)` }" aria-hidden="true">
                <i v-for="n in size.n * size.n" :key="n" class="!h-[0.3rem] !w-[0.3rem]" />
              </span>
              {{ size.label }}
            </button>
          </div>
        </div>

        <h3 class="mt-5 font-extrabold">Welches Bild?</h3>
        <div class="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6" role="radiogroup" aria-label="Puzzle-Bild">
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

        <label class="mt-4 block text-sm font-bold" for="puzzle-upload">
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

      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[#dceddc] p-4 text-[#27462f]">
        <p class="font-bold" aria-live="polite">{{ lobbyHint }}</p>
        <AppButton class="px-8 text-xl" :disabled="!canStart" @click="startGame">
          Los geht's!
          <span aria-hidden="true">→</span>
        </AppButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lobby-tile {
  position: relative;
  display: flex;
  min-height: 8.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 1.2rem;
  border: 4px solid transparent;
  background: #fff;
  padding: 0.6rem 0.5rem;
  font-weight: 800;
  box-shadow: 0 4px 0 #e3c69d;
  transition: transform 0.12s ease, background-color 0.12s ease;
}

.lobby-tile:not(:disabled):hover {
  transform: translateY(-2px);
}

.lobby-tile:focus-visible {
  outline: 4px solid var(--color-accent);
  outline-offset: 2px;
}

.lobby-tile:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.lobby-tile.is-selected {
  border-color: var(--seat);
  background: color-mix(in srgb, var(--seat) 14%, white);
}

.lobby-tile.is-add {
  border: 3px dashed #d6b88e;
  background: transparent;
  box-shadow: none;
  color: #8a6a4a;
}

.seat-badge {
  position: absolute;
  top: 0.4rem;
  left: 0.5rem;
  border-radius: 999px;
  background: var(--seat);
  padding: 0 0.45rem;
  font-size: 0.7rem;
}

.check,
.remove {
  position: absolute;
  top: -0.6rem;
  right: -0.6rem;
  display: grid;
  width: 1.9rem;
  height: 1.9rem;
  place-items: center;
  border-radius: 999px;
  border: 3px solid #fff;
  background: var(--seat);
  color: #fff;
  font-size: 0.9rem;
}

.remove {
  background: #6b4f3a;
}

.option-btn {
  display: inline-flex;
  min-height: var(--hit-min);
  align-items: center;
  gap: 0.5rem;
  border-radius: 1rem;
  border: 3px solid #ead7b8;
  background: #fff;
  padding: 0.4rem 1rem;
  font-weight: 800;
}

.option-btn.is-on {
  border-color: var(--color-accent);
  background: #fde9e1;
}

.option-btn:focus-visible {
  outline: 4px solid var(--color-accent);
  outline-offset: 2px;
}

.mini-grid {
  display: inline-grid;
  gap: 2px;
}

.mini-grid i {
  display: block;
  width: 0.45rem;
  height: 0.6rem;
  border-radius: 2px;
  background: var(--color-accent);
}
</style>
