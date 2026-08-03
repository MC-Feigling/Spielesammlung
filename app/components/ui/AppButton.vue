<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'ghost'

withDefaults(defineProps<{
  variant?: ButtonVariant
  block?: boolean
}>(), {
  variant: 'primary',
  block: false,
})
</script>

<template>
  <button
    v-bind="$attrs"
    class="inline-flex min-h-[var(--hit-min)] items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      {
        primary: 'bg-[var(--color-accent)] text-white shadow-[0_4px_0_#9e3b24] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#9e3b24] active:translate-y-0 active:shadow-[0_2px_0_#9e3b24]',
        secondary: 'bg-[var(--color-felt)] text-white shadow-[0_4px_0_#27462f] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#27462f] active:translate-y-0 active:shadow-[0_2px_0_#27462f]',
        ghost: 'bg-white/70 text-[var(--color-ink)] ring-2 ring-[var(--color-wood)] hover:bg-white',
      }[variant],
      block ? 'w-full' : '',
    ]"
  >
    <slot />
  </button>
</template>
