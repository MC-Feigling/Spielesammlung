<script setup lang="ts">
/**
 * On-screen buttons for action games, so touchpads and touchscreens work
 * without a keyboard. Emits press/release per button id (pointer events).
 */
export interface TouchControlButton {
  id: string
  label: string
  icon: string
  /** Visually emphasised main action (e.g. shoot, jump). */
  primary?: boolean
}

defineProps<{
  playerName: string
  color: string
  buttons: TouchControlButton[]
  /** Arrange the first four buttons as a cross (up, left, down, right). */
  dpad?: boolean
}>()

const emit = defineEmits<{
  press: [id: string]
  release: [id: string]
}>()

const pressed = new Set<string>()

function onDown(event: PointerEvent, id: string) {
  event.preventDefault()
  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture?.(event.pointerId)
  if (pressed.has(id)) return
  pressed.add(id)
  emit('press', id)
}

function onUp(id: string) {
  if (!pressed.has(id)) return
  pressed.delete(id)
  emit('release', id)
}
</script>

<template>
  <div
    class="flex select-none items-center gap-3 rounded-[1.2rem] bg-white/70 px-3 py-2 ring-2 ring-[#ecd4ae]"
    :aria-label="`Steuerknöpfe für ${playerName}`"
  >
    <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: color }" aria-hidden="true" />
    <span class="max-w-[12rem] truncate text-sm font-extrabold">{{ playerName }}</span>
    <div :class="dpad ? 'dpad' : 'flex gap-2'">
      <button
        v-for="(button, index) in buttons"
        :key="button.id"
        type="button"
        class="touch-btn"
        :class="[
          button.primary ? 'is-primary' : '',
          dpad && index < 4 ? `dpad-${index}` : '',
        ]"
        :style="button.primary ? { backgroundColor: color } : undefined"
        :aria-label="button.label"
        @pointerdown="onDown($event, button.id)"
        @pointerup="onUp(button.id)"
        @pointercancel="onUp(button.id)"
        @lostpointercapture="onUp(button.id)"
        @contextmenu.prevent
      >
        <span aria-hidden="true">{{ button.icon }}</span>
        <span v-if="!dpad || index >= 4" class="text-xs">{{ button.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.touch-btn {
  display: inline-flex;
  min-width: 3rem;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 0.9rem;
  border: 2px solid #dfbd8c;
  background: #fff;
  padding: 0 0.75rem;
  font-size: 1.1rem;
  font-weight: 900;
  touch-action: none;
  box-shadow: 0 3px 0 #dfbd8c;
}

.touch-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #dfbd8c;
}

.touch-btn.is-primary {
  border-color: rgba(0, 0, 0, 0.15);
  color: #fff;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
}

.dpad {
  display: grid;
  grid-template-columns: repeat(3, 3rem) auto;
  grid-template-rows: repeat(2, 2.6rem);
  gap: 0.25rem;
  align-items: center;
}

.dpad .touch-btn {
  min-height: 2.6rem;
  padding: 0;
}

.dpad-0 { grid-column: 2; grid-row: 1; }
.dpad-1 { grid-column: 1; grid-row: 2; }
.dpad-2 { grid-column: 2; grid-row: 2; }
.dpad-3 { grid-column: 3; grid-row: 2; }

.dpad .touch-btn:nth-child(5) {
  grid-column: 4;
  grid-row: 1 / span 2;
  height: 100%;
  margin-left: 0.5rem;
  padding: 0 1rem;
}
</style>
