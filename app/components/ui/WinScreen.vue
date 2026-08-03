<script setup lang="ts">
const props = defineProps<{
  winnerNames: string[]
}>()

defineEmits<{
  backToHub: []
}>()

const announcement = computed(() => {
  const names = props.winnerNames.join(' und ')
  return `${names} ${props.winnerNames.length === 1 ? 'gewinnt' : 'gewinnen'}!`
})
</script>

<template>
  <section
    aria-live="assertive"
    class="rounded-3xl bg-[#dceddc] p-6 text-center text-[#27462f] shadow-[0_6px_0_#71a56f] ring-4 ring-[#a5cfa0] sm:p-10"
  >
    <p class="text-5xl" aria-hidden="true">🏆</p>
    <p class="mt-4 font-bold uppercase tracking-[0.18em]">Spiel beendet</p>
    <h2 class="mt-2 font-[var(--font-display)] text-3xl font-semibold sm:text-4xl">{{ announcement }}</h2>
    <p class="mt-3 text-[var(--text-base)]">Tolle Runde!</p>
    <AppButton class="mt-6" @click="$emit('backToHub')">Zur Spielauswahl</AppButton>
  </section>
</template>
