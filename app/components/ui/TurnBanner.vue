<script setup lang="ts">
const props = defineProps<{
  playerName: string
  isAi: boolean
}>()

const message = computed(() => props.isAi
  ? `${props.playerName} denkt nach …`
  : `${props.playerName} ist dran!`)
</script>

<template>
  <section
    aria-live="polite"
    class="rounded-3xl bg-[var(--color-felt)] px-5 py-4 text-center text-white shadow-[0_4px_0_#27462f]"
  >
    <p class="font-[var(--font-display)] text-2xl font-semibold sm:text-3xl">{{ message }}</p>
    <p class="mt-1 font-bold text-white/85">{{ isAi ? 'Die Karten werden gleich aufgedeckt.' : 'Finde zwei gleiche Karten.' }}</p>
  </section>
</template>
