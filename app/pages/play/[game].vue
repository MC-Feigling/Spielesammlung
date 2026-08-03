<script setup lang="ts">
import { isGameId } from '~/constants/games'

const route = useRoute()
const routeGame = Array.isArray(route.params.game) ? route.params.game[0] : route.params.game

if (typeof routeGame !== 'string' || !isGameId(routeGame)) {
  void navigateTo('/')
}
</script>

<template>
  <section class="mx-auto max-w-2xl rounded-3xl bg-[var(--color-panel)] p-6 text-center shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
    <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Spielrunde</p>
    <h1 class="mt-2 font-[var(--font-display)] text-4xl font-semibold">Gleich geht es los!</h1>
    <p class="mt-3 text-[var(--text-base)]">Das Spielbrett kommt im nächsten Schritt.</p>
    <AppButton class="mt-6" @click="navigateTo('/')">Zur Spielauswahl</AppButton>
  </section>
</template>
