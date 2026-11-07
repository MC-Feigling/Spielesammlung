<script setup lang="ts">
/** Top-down race car facing up, ~60×100 sprite units, centred on (30, 50). Use inside an <svg>. */
withDefaults(defineProps<{
  color: string
  number: number
  /** Show exhaust flames (fast) */
  flames?: boolean
}>(), {
  flames: false,
})

const FRONT_TIRES = [[0, 14], [48, 14]] as const
const REAR_TIRES = [[-2, 64], [48, 64]] as const
</script>

<template>
  <g class="race-car">
    <ellipse cx="34" cy="56" rx="30" ry="48" fill="rgba(0,0,0,0.28)" />
    <g v-if="flames" class="race-car-flames">
      <g v-for="dx in [18, 42]" :key="`flame-${dx}`" :transform="`translate(${dx} 98)`">
        <path d="M-6 0 C-8 10 -2 20 0 26 C2 20 8 10 6 0 Z" fill="#ff8a3d" />
        <path d="M-3 0 C-4 7 -1 13 0 17 C1 13 4 7 3 0 Z" fill="#ffd23f" />
      </g>
    </g>
    <g v-for="([x, y], i) in FRONT_TIRES" :key="`ft-${i}`">
      <rect :x="x" :y="y" width="12" height="20" rx="4" fill="#1a1a1a" />
      <path :d="`M${x + 2} ${y + 5} h8 M${x + 2} ${y + 10} h8 M${x + 2} ${y + 15} h8`" stroke="#444" stroke-width="2" />
    </g>
    <g v-for="([x, y], i) in REAR_TIRES" :key="`rt-${i}`">
      <rect :x="x" :y="y" width="14" height="24" rx="4" fill="#1a1a1a" />
      <path :d="`M${x + 2} ${y + 6} h10 M${x + 2} ${y + 12} h10 M${x + 2} ${y + 18} h10`" stroke="#444" stroke-width="2" />
    </g>
    <rect x="6" y="2" width="48" height="8" rx="3" fill="#2b2118" />
    <rect x="8" y="3" width="44" height="4" rx="2" :fill="color" />
    <path
      d="M30 4 C38 4 41 12 41 22 L43 40 C50 44 52 60 50 78 C48 91 40 96 30 96 C20 96 12 91 10 78 C8 60 10 44 17 40 L19 22 C19 12 22 4 30 4 Z"
      :fill="color"
    />
    <path d="M27 4 h6 v92 h-6 Z" fill="#fff" opacity="0.45" />
    <path d="M14 46 C18 42 24 41 30 41" stroke="#fff" stroke-width="2" fill="none" opacity="0.5" />
    <circle cx="30" cy="26" r="9" fill="#fff" />
    <text
      x="30"
      y="31"
      text-anchor="middle"
      font-family="Arial Black, Arial, sans-serif"
      font-weight="900"
      font-size="13"
      fill="#2b2118"
    >{{ number }}</text>
    <ellipse cx="30" cy="60" rx="10" ry="15" fill="#1c1c1c" />
    <circle cx="30" cy="58" r="7" fill="#fff" />
    <path d="M24 55 A7 7 0 0 1 36 55 L35 57 L25 57 Z" fill="#2a3b55" />
    <path d="M23 60 h14" :stroke="color" stroke-width="2.4" />
    <rect x="4" y="90" width="52" height="9" rx="3" fill="#2b2118" />
    <rect x="7" y="92" width="46" height="4" rx="2" :fill="color" />
  </g>
</template>

<style scoped>
.race-car-flames {
  animation: race-flame 0.12s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: top center;
}

@keyframes race-flame {
  from { transform: scaleY(0.75); opacity: 0.85; }
  to { transform: scaleY(1.1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .race-car-flames {
    animation: none;
  }
}
</style>
