<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
}>(), {
  cancelLabel: 'Weiterspielen',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm')
  close()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 grid place-items-center bg-[#2b2118]/55 p-4"
      role="presentation"
      @click.self="close"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        class="w-full max-w-md rounded-3xl bg-[var(--color-panel)] p-6 shadow-[0_8px_0_#9e3b24] ring-4 ring-[#dfbd8c]"
      >
        <h2 id="dialog-title" class="font-[var(--font-display)] text-3xl font-semibold">{{ title }}</h2>
        <p id="dialog-description" class="mt-3 text-[var(--text-base)]">{{ description }}</p>
        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <AppButton autofocus variant="ghost" @click="close">{{ cancelLabel }}</AppButton>
          <AppButton @click="confirm">{{ confirmLabel }}</AppButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>
