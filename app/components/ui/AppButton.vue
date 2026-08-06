<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

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
    type="button"
    v-bind="$attrs"
    class="inline-flex min-h-[var(--hit-min)] items-center justify-center gap-2 rounded-2xl border-2 px-5 py-3 font-bold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      {
        primary: 'border-[#9e3b24] bg-[var(--color-accent)] text-white shadow-[0_4px_0_#9e3b24] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#9e3b24] active:translate-y-0 active:shadow-[0_2px_0_#9e3b24]',
        secondary: 'border-[#27462f] bg-[var(--color-felt)] text-white shadow-[0_4px_0_#27462f] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#27462f] active:translate-y-0 active:shadow-[0_2px_0_#27462f]',
        ghost: 'border-[var(--color-wood)] bg-white text-[var(--color-ink)] shadow-[0_3px_0_#c48a4a] hover:bg-[#fff6e8]',
        danger: 'border-[#9e3b24] bg-[var(--color-accent)] text-white shadow-[0_4px_0_#9e3b24] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#9e3b24] active:translate-y-0 active:shadow-[0_2px_0_#9e3b24]',
      }[variant],
      block ? 'w-full' : '',
    ]"
  >
    <slot />
  </button>
</template>
