<script setup lang="ts">
import { GAMES } from '~/constants/games'

const profilesStore = useProfilesStore()

function openGameLobby(gameId: string) {
  return navigateTo(`/lobby/${gameId}`)
}
</script>

<template>
  <section aria-labelledby="hub-heading">
    <div class="max-w-2xl">
      <p class="font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Bereit zum Spielen?</p>
      <h1 id="hub-heading" class="mt-2 font-[var(--font-display)] text-4xl font-semibold sm:text-5xl">
        Wähle ein Spiel aus
      </h1>
      <p class="mt-3 text-[var(--text-base)] leading-relaxed">
        Gemeinsam spielen, lachen und gewinnen.
      </p>
    </div>

    <div
      v-if="profilesStore.profiles.length === 0"
      class="mt-8 flex flex-col items-start gap-4 rounded-3xl border-2 border-[#dfbd8c] bg-[#fff6e8] p-5 shadow-[0_4px_0_#c48a4a] sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="font-[var(--font-display)] text-xl font-semibold">Noch kein Profil?</p>
        <p class="mt-1">Zuerst ein Profil anlegen, damit ihr losspielen könnt.</p>
      </div>
      <AppButton @click="navigateTo('/profiles')">Profil anlegen</AppButton>
    </div>

    <div class="mt-8 grid gap-6 md:grid-cols-3">
      <GameCard
        v-for="game in GAMES"
        :key="game.id"
        :game="game"
        @select="openGameLobby(game.id)"
      />
    </div>
  </section>
</template>
