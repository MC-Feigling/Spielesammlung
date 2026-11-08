<script setup lang="ts">
import { onBeforeUnmount, watchEffect } from 'vue'

const props = defineProps<{
  playerName: string
  isAi: boolean
  hint?: string
  seatIndex?: number
}>()

const message = computed(() => props.isAi
  ? `${props.playerName} denkt nach …`
  : `${props.playerName} ist dran!`)
const hint = computed(() => props.hint ?? 'Finde zwei gleiche Karten.')

/** On the play page the turn is shown in the compact game bar instead of a big banner. */
const bar = useGameBar()

if (bar) {
  watchEffect(() => {
    bar.turn = {
      seatIndex: props.seatIndex ?? null,
      playerName: props.playerName,
      isAi: props.isAi,
      hint: hint.value,
    }
  })
  onBeforeUnmount(() => {
    bar.turn = null
  })
}
</script>

<template>
  <section
    v-if="!bar"
    aria-live="polite"
    class="rounded-3xl bg-[var(--color-felt)] px-5 py-4 text-center text-white shadow-[0_4px_0_#27462f]"
  >
    <p class="font-[var(--font-display)] text-2xl font-semibold sm:text-3xl">{{ message }}</p>
    <p class="mt-1 font-bold text-white/85">{{ hint }}</p>
  </section>
</template>
