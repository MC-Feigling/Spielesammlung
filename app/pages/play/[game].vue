<script setup lang="ts">
import { computed, ref } from 'vue'
import { isGameId } from '~/constants/games'

const route = useRoute()
const session = useSessionStore()
const routeGame = Array.isArray(route.params.game) ? route.params.game[0] : route.params.game
const winnerSeatIndexes = ref<number[]>([])
const players = computed(() => session.players)
const memoryGrid = computed(() => session.memoryGridSize === '4x4'
  ? { rows: 4, cols: 4 }
  : { rows: 4, cols: 3 })
const winners = computed(() => winnerSeatIndexes.value
  .map((seatIndex) => players.value[seatIndex]?.displayName)
  .filter((name): name is string => Boolean(name)))

if (typeof routeGame !== 'string' || !isGameId(routeGame)) {
  void navigateTo('/')
}

if (
  (routeGame === 'memory' || routeGame === 'kniffel' || routeGame === 'ludo')
  && (session.gameId !== routeGame || players.value.length < 2)
) {
  void navigateTo(`/lobby/${routeGame}`)
}

function quitGame() {
  session.endSession()
  void navigateTo('/')
}
</script>

<template>
  <section v-if="routeGame === 'memory' && players.length >= 2" class="mx-auto max-w-4xl">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde</p>
        <h1 class="font-[var(--font-display)] text-4xl font-semibold">Memory</h1>
      </div>
      <AppButton variant="ghost" @click="quitGame">Spiel beenden</AppButton>
    </header>

    <div v-if="winners.length > 0" class="rounded-3xl bg-[#dceddc] p-6 text-center text-[#27462f]">
      <h2 class="font-[var(--font-display)] text-3xl font-semibold">
        {{ winners.join(' und ') }} {{ winners.length === 1 ? 'gewinnt' : 'gewinnen' }}!
      </h2>
      <AppButton class="mt-5" @click="quitGame">Zur Spielauswahl</AppButton>
    </div>
    <MemoryBoard
      v-else
      :players="players"
      :rows="memoryGrid.rows"
      :cols="memoryGrid.cols"
      @complete="winnerSeatIndexes = $event"
    />
  </section>

  <section v-else-if="routeGame === 'kniffel' && players.length >= 2" class="mx-auto max-w-5xl">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde</p>
        <h1 class="font-[var(--font-display)] text-4xl font-semibold">Kniffel</h1>
      </div>
      <AppButton variant="ghost" @click="quitGame">Spiel beenden</AppButton>
    </header>

    <div v-if="winners.length > 0" class="rounded-3xl bg-[#dceddc] p-6 text-center text-[#27462f]">
      <h2 class="font-[var(--font-display)] text-3xl font-semibold">
        {{ winners.join(' und ') }} {{ winners.length === 1 ? 'gewinnt' : 'gewinnen' }}!
      </h2>
      <AppButton class="mt-5" @click="quitGame">Zur Spielauswahl</AppButton>
    </div>
    <KniffelBoard v-else :players="players" @complete="winnerSeatIndexes = $event" />
  </section>

  <section v-else-if="routeGame === 'ludo' && players.length >= 2" class="mx-auto max-w-5xl">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde</p>
        <h1 class="font-[var(--font-display)] text-4xl font-semibold">Mensch ärgere dich nicht</h1>
      </div>
      <AppButton variant="ghost" @click="quitGame">Spiel beenden</AppButton>
    </header>

    <div v-if="winners.length > 0" class="rounded-3xl bg-[#dceddc] p-6 text-center text-[#27462f]">
      <h2 class="font-[var(--font-display)] text-3xl font-semibold">
        {{ winners.join(' und ') }} {{ winners.length === 1 ? 'gewinnt' : 'gewinnen' }}!
      </h2>
      <AppButton class="mt-5" @click="quitGame">Zur Spielauswahl</AppButton>
    </div>
    <LudoBoard v-else :players="players" @complete="winnerSeatIndexes = $event" />
  </section>

  <section v-else class="mx-auto max-w-2xl rounded-3xl bg-[var(--color-panel)] p-6 text-center shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
    <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde</p>
    <h1 class="mt-2 font-[var(--font-display)] text-4xl font-semibold">Gleich geht es los!</h1>
    <p class="mt-3 text-[var(--text-base)]">Das Spielbrett kommt im nächsten Schritt.</p>
    <AppButton class="mt-6" @click="quitGame">Zur Spielauswahl</AppButton>
  </section>
</template>
