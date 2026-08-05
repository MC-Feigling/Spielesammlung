<script setup lang="ts">
const FACE_VALUES = [1, 2, 3, 4, 5, 6] as const

const PIP_CELLS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

const FACE_ROTATIONS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(0deg) rotateY(-90deg)',
  3: 'rotateX(90deg) rotateY(0deg)',
  4: 'rotateX(-90deg) rotateY(0deg)',
  5: 'rotateX(0deg) rotateY(90deg)',
  6: 'rotateX(0deg) rotateY(180deg)',
}

const SIZE_CLASSES = {
  sm: 'h-12 w-12 [--dice-size:3rem]',
  md: 'h-16 w-16 [--dice-size:4rem]',
  lg: 'h-20 w-20 [--dice-size:5rem]',
} as const

const props = withDefaults(defineProps<{
  value: number | null
  isRolling?: boolean
  held?: boolean
  size?: keyof typeof SIZE_CLASSES
  interactive?: boolean
  placeholder?: boolean
  label?: string
}>(), {
  isRolling: false,
  held: false,
  size: 'md',
  interactive: false,
  placeholder: false,
})

const emit = defineEmits<{
  click: []
}>()

const showCube = computed(() => !props.placeholder && (props.value !== null || props.isRolling))

const cubeTransform = computed(() => {
  if (props.isRolling || props.value === null) return undefined
  return FACE_ROTATIONS[props.value] ?? FACE_ROTATIONS[1]
})

const ariaLabel = computed(() => {
  if (props.label) return props.label
  if (props.placeholder) return 'Leerer Würfel'
  if (props.isRolling) return 'Würfel rollt'
  if (props.value === null) return 'Würfel'
  return `${props.value} Augen${props.held ? ', gehalten' : ''}`
})

function handleClick() {
  if (!props.interactive || props.isRolling) return
  emit('click')
}
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    type="button"
    class="dice-root"
    :class="[
      SIZE_CLASSES[size],
      interactive ? 'dice-root--interactive' : 'dice-root--static',
      held ? 'dice-root--held' : 'dice-root--default',
      isRolling ? 'dice-root--rolling' : '',
    ]"
    :disabled="interactive ? isRolling : undefined"
    :aria-label="ariaLabel"
    :aria-pressed="interactive ? held : undefined"
    @click="handleClick"
  >
    <div
      v-if="placeholder && !showCube"
      class="dice-placeholder"
      aria-hidden="true"
    >
      ?
    </div>

    <div
      v-else
      class="dice-scene motion-reduce:[perspective:none]"
    >
      <div
        class="dice-cube motion-reduce:transform-none"
        :class="{ 'dice-cube--rolling': isRolling }"
        :style="cubeTransform ? { transform: cubeTransform } : undefined"
      >
        <div
          v-for="faceValue in FACE_VALUES"
          :key="faceValue"
          class="dice-face"
          :class="`dice-face--${faceValue}`"
        >
          <div class="dice-pips">
            <span
              v-for="cell in 9"
              :key="cell"
              class="dice-pip-cell"
            >
              <span
                v-if="PIP_CELLS[faceValue]?.includes(cell)"
                class="dice-pip"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  </component>
</template>

<style scoped>
.dice-root {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  border: 4px solid transparent;
  background: transparent;
  padding: 0;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
}

.dice-root--interactive {
  cursor: pointer;
}

.dice-root--interactive:focus-visible {
  outline: 4px solid var(--color-accent);
  outline-offset: 2px;
}

.dice-root--interactive:not(:disabled):hover {
  transform: translateY(-2px);
}

.dice-root--default {
  border-color: #9e3b24;
  box-shadow: 0 4px 0 #c48a4a;
}

.dice-root--held {
  border-color: var(--color-accent);
  background: #fff3c4;
  box-shadow: 0 4px 0 #d45d3a;
  transform: scale(1.03);
}

.dice-root--rolling {
  border-color: #9e3b24;
  box-shadow: 0 4px 0 #c48a4a;
}

.dice-placeholder {
  display: grid;
  height: 100%;
  width: 100%;
  place-items: center;
  border-radius: 1rem;
  border: 4px dashed #dfbd8c;
  background: #fffaf0;
  font-size: 1.75rem;
  font-weight: 900;
  color: #c8b49a;
}

.dice-scene {
  height: 100%;
  width: 100%;
  perspective: 600px;
}

.dice-cube {
  position: relative;
  height: 100%;
  width: 100%;
  transform-style: preserve-3d;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dice-cube--rolling {
  animation: dice-tumble 700ms linear infinite;
}

.dice-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 0.85rem;
  border: 3px solid #9e3b24;
  background: #fff;
  backface-visibility: hidden;
}

.dice-face--1 {
  transform: rotateY(0deg) translateZ(calc(var(--dice-size) / 2));
}

.dice-face--6 {
  transform: rotateY(180deg) translateZ(calc(var(--dice-size) / 2));
}

.dice-face--2 {
  transform: rotateY(90deg) translateZ(calc(var(--dice-size) / 2));
}

.dice-face--5 {
  transform: rotateY(-90deg) translateZ(calc(var(--dice-size) / 2));
}

.dice-face--3 {
  transform: rotateX(90deg) translateZ(calc(var(--dice-size) / 2));
}

.dice-face--4 {
  transform: rotateX(-90deg) translateZ(calc(var(--dice-size) / 2));
}

.dice-pips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.15rem;
  width: 68%;
  height: 68%;
}

.dice-pip-cell {
  display: grid;
  place-items: center;
}

.dice-pip {
  height: 0.42rem;
  width: 0.42rem;
  border-radius: 9999px;
  background: #4c3424;
}

@keyframes dice-tumble {
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }

  25% {
    transform: rotateX(180deg) rotateY(120deg) rotateZ(45deg);
  }

  50% {
    transform: rotateX(360deg) rotateY(240deg) rotateZ(90deg);
  }

  75% {
    transform: rotateX(540deg) rotateY(300deg) rotateZ(135deg);
  }

  100% {
    transform: rotateX(720deg) rotateY(360deg) rotateZ(180deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dice-cube--rolling {
    animation: dice-tumble-reduced 700ms ease-in-out infinite;
  }

  @keyframes dice-tumble-reduced {
    0%,
    100% {
      transform: rotateX(0deg) rotateY(0deg);
    }

    50% {
      transform: rotateX(0deg) rotateY(180deg);
    }
  }
}
</style>
