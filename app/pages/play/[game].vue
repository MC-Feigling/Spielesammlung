<script setup lang="ts">
import { computed, ref } from 'vue'
import { isGameId } from '~/constants/games'
import { humanWinnerProfileIds } from '~/features/profiles/winning-profiles'

const route = useRoute()
const session = useSessionStore()
const profiles = useProfilesStore()
const routeGame = Array.isArray(route.params.game) ? route.params.game[0] : route.params.game
const activeGameId = typeof routeGame === 'string' && isGameId(routeGame) ? routeGame : null
const winnerSeatIndexes = ref<number[]>([])
const isQuitDialogOpen = ref(false)
const hasRecordedWin = ref(false)
const players = computed(() => session.players)
const memoryGrid = computed(() => session.memoryGridSize === '4x4'
  ? { rows: 4, cols: 4 }
  : { rows: 4, cols: 3 })
const gameTitle = computed(() => {
  if (routeGame === 'memory') return 'Memory'
  if (routeGame === 'kniffel') return 'Kniffel'
  return 'Mensch ärgere dich nicht'
})
const winners = computed(() => winnerSeatIndexes.value
  .map((seatIndex) => players.value[seatIndex]?.displayName)
  .filter((name): name is string => Boolean(name)))

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

function completeGame(nextWinnerSeatIndexes: number[]) {
  if (hasRecordedWin.value || nextWinnerSeatIndexes.length === 0 || !activeGameId) return

  winnerSeatIndexes.value = nextWinnerSeatIndexes
  hasRecordedWin.value = true

  for (const profileId of humanWinnerProfileIds(players.value, nextWinnerSeatIndexes)) {
    profiles.recordWin(profileId, activeGameId)
  }
}
</script>

<template>
  <section v-if="players.length >= 2" class="mx-auto max-w-5xl">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde</p>
        <h1 class="font-[var(--font-display)] text-4xl font-semibold">{{ gameTitle }}</h1>
      </div>
      <AppButton variant="ghost" @click="isQuitDialogOpen = true">Spiel beenden</AppButton>
    </header>

    <WinScreen v-if="winners.length > 0" :winner-names="winners" @back-to-hub="endGame" />
    <MemoryBoard
      v-else-if="routeGame === 'memory'"
      :players="players"
      :rows="memoryGrid.rows"
      :cols="memoryGrid.cols"
      @complete="completeGame"
    />
    <KniffelBoard v-else-if="routeGame === 'kniffel'" :players="players" @complete="completeGame" />
    <LudoBoard v-else-if="routeGame === 'ludo'" :players="players" @complete="completeGame" />

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
