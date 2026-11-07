<script setup lang="ts">
import { computed, ref } from 'vue'
import { gameTitle, isGameId } from '~/constants/games'
import { humanWinnerProfileIds } from '~/features/profiles/winning-profiles'
import { buildPodium, type GameStanding } from '~/features/games/shared/standings'
import { playerColor, playerTextColor } from '~/constants/players'
import type { WinScreenEntry } from '~/components/ui/WinScreen.vue'
import { resolvePuzzleImageUrl } from '~/features/games/puzzleRace/images'
import type { PuzzleGridSize } from '~/features/games/puzzleRace/engine'

const route = useRoute()
const session = useSessionStore()
const profiles = useProfilesStore()
const routeGame = Array.isArray(route.params.game) ? route.params.game[0] : route.params.game
const activeGameId = typeof routeGame === 'string' && isGameId(routeGame) ? routeGame : null
const winnerSeatIndexes = ref<number[]>([])
const finalStandings = ref<GameStanding[] | undefined>(undefined)
const winNote = ref('')
const roundKey = ref(0)
const gameBar = provideGameBar()
const isQuitDialogOpen = ref(false)
const hasRecordedWin = ref(false)
const players = computed(() => session.players)
const memoryGrid = computed(() => session.memoryGridSize === '4x4'
  ? { rows: 4, cols: 4 }
  : { rows: 4, cols: 3 })
const puzzleImageUrl = computed(() =>
  resolvePuzzleImageUrl(session.puzzleImageId, session.puzzleImageDataUrl),
)
const puzzleGridSize = computed(() => session.puzzleGridSize as PuzzleGridSize)
const gameTitleText = computed(() => gameTitle(activeGameId))
const winners = computed(() => winnerSeatIndexes.value
  .map((seatIndex) => players.value[seatIndex]?.displayName)
  .filter((name): name is string => Boolean(name)))

const winHeadline = computed(() => {
  const names = winners.value
  if (names.length === 0) return ''
  if (names.length === 1) return `${names[0]} gewinnt!`
  return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]} gewinnen!`
})

const podiumEntries = computed<WinScreenEntry[]>(() =>
  buildPodium(players.value.length, winnerSeatIndexes.value, finalStandings.value)
    .map((entry) => {
      const player = players.value[entry.seatIndex]!
      return {
        key: entry.seatIndex,
        name: player.displayName,
        avatarId: player.avatarId,
        isAi: player.type === 'ai',
        color: playerColor(entry.seatIndex),
        textColor: playerTextColor(entry.seatIndex),
        place: entry.place,
        label: entry.label,
      }
    }))

if (!activeGameId) {
  void navigateTo('/')
}

if (
  activeGameId
  && (session.gameId !== activeGameId || players.value.length < 2)
) {
  void navigateTo(`/lobby/${activeGameId}`)
}

async function endGame() {
  await navigateTo('/')
  session.endSession()
}

function completeGame(nextWinnerSeatIndexes: number[], standings?: GameStanding[]) {
  if (hasRecordedWin.value || nextWinnerSeatIndexes.length === 0 || !activeGameId) return

  winnerSeatIndexes.value = nextWinnerSeatIndexes
  finalStandings.value = standings
  hasRecordedWin.value = true
  gameBar.turn = null

  const notes: string[] = []
  for (const profileId of humanWinnerProfileIds(players.value, nextWinnerSeatIndexes)) {
    profiles.recordWin(profileId, activeGameId)
    const profile = profiles.profiles.find((item) => item.id === profileId)
    const count = profile?.wins[activeGameId] ?? 0
    if (profile && count > 0) notes.push(`${profile.name}s ${count}. Sieg in ${gameTitleText.value}!`)
  }
  winNote.value = notes.join(' ')
}

function playAgain() {
  winnerSeatIndexes.value = []
  finalStandings.value = undefined
  winNote.value = ''
  hasRecordedWin.value = false
  gameBar.turn = null
  roundKey.value += 1
}
</script>

<template>
  <section v-if="players.length >= 2" class="mx-auto max-w-6xl">
    <GameBar
      :title="gameTitleText"
      :players="players"
      :turn="winners.length > 0 ? null : gameBar.turn"
      @quit="isQuitDialogOpen = true"
    />

    <WinScreen
      v-if="winners.length > 0"
      :game-title="gameTitleText"
      :headline="winHeadline"
      :entries="podiumEntries"
      :note="winNote"
      @again="playAgain"
      @back-to-hub="endGame"
    />
    <div v-else :key="roundKey">
    <MemoryBoard
      v-if="routeGame === 'memory'"
      :players="players"
      :rows="memoryGrid.rows"
      :cols="memoryGrid.cols"
      @complete="completeGame"
    />
    <KniffelBoard v-else-if="routeGame === 'kniffel'" :players="players" @complete="completeGame" />
    <LudoBoard v-else-if="routeGame === 'ludo'" :players="players" @complete="completeGame" />
    <RacingBoard
      v-else-if="routeGame === 'racing'"
      :players="players"
      @complete="completeGame"
    />
    <HorseRacingBoard
      v-else-if="routeGame === 'horseRacing'"
      :players="players"
      @complete="completeGame"
    />
    <PuzzleRaceBoard
      v-else-if="routeGame === 'puzzleRace'"
      :players="players"
      :grid-size="puzzleGridSize"
      :image-url="puzzleImageUrl"
      @complete="completeGame"
    />
    <DragonBossBoard
      v-else-if="routeGame === 'dragonBoss'"
      :players="players"
      @complete="completeGame"
    />
    <HandymanBoard
      v-else-if="routeGame === 'handyman'"
      :players="players"
      @complete="completeGame"
    />
    <UnoBoard
      v-else-if="routeGame === 'uno'"
      :players="players"
      @complete="completeGame"
    />
    <ConnectFourBoard
      v-else-if="routeGame === 'connectFour'"
      :players="players"
      @complete="completeGame"
    />
    <ShutTheBoxBoard
      v-else-if="routeGame === 'shutTheBox'"
      :players="players"
      @complete="completeGame"
    />
    <MuehleBoard
      v-else-if="routeGame === 'muehle'"
      :players="players"
      @complete="completeGame"
    />

    </div>

    <AppDialog
      v-model="isQuitDialogOpen"
      title="Wirklich abbrechen?"
      description="Der aktuelle Spielstand geht verloren."
      confirm-label="Spiel abbrechen"
      @confirm="endGame"
    />
  </section>

  <section v-else class="mx-auto max-w-2xl rounded-3xl bg-[var(--color-panel)] p-6 text-center shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
    <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde</p>
    <h1 class="mt-2 font-[var(--font-display)] text-4xl font-semibold">Gleich geht es los!</h1>
    <p class="mt-3 text-[var(--text-base)]">Wird geladen…</p>
    <AppButton class="mt-6" @click="endGame">Zur Spielauswahl</AppButton>
  </section>
</template>
