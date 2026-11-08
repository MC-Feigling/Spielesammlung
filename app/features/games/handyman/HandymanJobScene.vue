<script setup lang="ts">
/** Small scene per job: shows the problem, and the fixed state once `done`. */
defineProps<{
  jobId: string
  done?: boolean
}>()

const FENCE_POSTS = [0, 1, 2, 3, 4, 5, 6]
</script>

<template>
  <svg viewBox="0 0 260 160" class="block h-full w-full" role="img" :aria-label="done ? 'Auftrag erledigt' : 'Auftrag'">
    <defs>
      <radialGradient id="hm-glow" cx="0.5" cy="0.5">
        <stop offset="0" stop-color="#ffe27a" stop-opacity="0.9" />
        <stop offset="1" stop-color="#ffe27a" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- room or garden -->
    <template v-if="jobId === 'fence' || jobId === 'bike'">
      <rect width="260" height="160" fill="#bfe3f2" />
      <circle cx="222" cy="30" r="16" fill="#ffe27a" />
      <rect y="118" width="260" height="42" fill="#7cc06a" />
      <rect y="118" width="260" height="6" fill="#5fa552" />
    </template>
    <template v-else>
      <rect width="260" height="160" fill="#d7ead9" />
      <rect v-for="n in 7" :key="`stripe-${n}`" :x="n * 37" y="0" width="2" height="160" fill="#c3dcc6" />
      <rect y="132" width="260" height="28" fill="#b07a45" />
      <rect y="128" width="260" height="6" fill="#8a5a30" />
    </template>

    <!-- lamp -->
    <g v-if="jobId === 'lamp'">
      <rect x="0" y="0" width="260" height="8" fill="#efe7da" />
      <circle v-if="done" cx="130" cy="80" r="58" fill="url(#hm-glow)" />
      <rect x="128" y="8" width="4" height="34" fill="#3a2a20" />
      <path d="M100 42 L160 42 L174 72 L86 72 Z" fill="#e45b3a" />
      <path d="M100 42 L160 42 L163 48 L97 48 Z" fill="#fff" opacity="0.3" />
      <circle cx="130" cy="78" r="11" :fill="done ? '#fff4b0' : '#d9d4cc'" stroke="#bdb5a8" stroke-width="2" />
      <template v-if="done">
        <path v-for="a in [-60, -30, 0, 30, 60]" :key="`ray-${a}`" :transform="`rotate(${a} 130 78)`" d="M130 96 v14" stroke="#f0b429" stroke-width="4" stroke-linecap="round" />
      </template>
      <template v-else>
        <path d="M150 14 C170 30 156 46 176 58" stroke="#e4572e" stroke-width="4" fill="none" />
        <path d="M176 58 l6 -2 M176 58 l2 6" stroke="#d98b3a" stroke-width="3" />
      </template>
    </g>

    <!-- faucet -->
    <g v-else-if="jobId === 'faucet'">
      <rect x="60" y="94" width="140" height="34" rx="8" fill="#f4f6f8" stroke="#c9ced6" stroke-width="3" />
      <rect x="122" y="40" width="14" height="30" rx="3" fill="#8b929c" />
      <path d="M122 58 h-26 a8 8 0 0 0 -8 8 v8 h10 v-6 h24 z" fill="#8b929c" />
      <rect x="116" y="36" width="26" height="8" rx="4" fill="#3d8fd1" />
      <template v-if="!done">
        <path v-for="(y, i) in [84, 104, 118]" :key="`drop-${i}`" :transform="`translate(93 ${y})`" d="M0 -8 C4 -2 5 2 0 5 C-5 2 -4 -2 0 -8 Z" fill="#3d8fd1" />
        <ellipse cx="93" cy="124" rx="18" ry="3" fill="#3d8fd1" opacity="0.5" />
      </template>
    </g>

    <!-- picture -->
    <g v-else-if="jobId === 'picture'">
      <circle cx="130" cy="30" r="3" :fill="done ? '#7d838c' : 'none'" :stroke="done ? 'none' : '#e45b3a'" stroke-width="2" stroke-dasharray="3 2" />
      <path v-if="done" d="M130 30 L100 50 M130 30 L160 50" stroke="#5d3a1f" stroke-width="2" />
      <g :transform="done ? '' : 'rotate(-14 130 100) translate(0 30)'">
        <rect x="88" y="48" width="84" height="64" rx="4" fill="#8a5a30" />
        <rect x="96" y="56" width="68" height="48" fill="#9fd3f0" />
        <circle cx="148" cy="70" r="8" fill="#ffd23f" />
        <path d="M96 104 l20 -24 l16 14 l14 -10 l18 20 z" fill="#58a04f" />
      </g>
    </g>

    <!-- shelf -->
    <g v-else-if="jobId === 'shelf'">
      <g :transform="done ? '' : 'rotate(12 70 76)'">
        <rect x="64" y="76" width="132" height="10" rx="2" fill="#b07a45" />
        <rect x="64" y="86" width="8" height="16" fill="#8b929c" />
        <rect x="188" y="86" width="8" height="16" fill="#8b929c" />
        <rect x="80" y="44" width="14" height="32" rx="2" fill="#e45b3a" />
        <rect x="96" y="50" width="12" height="26" rx="2" fill="#3d8fd1" />
        <rect x="110" y="46" width="14" height="30" rx="2" fill="#f0b429" />
        <rect x="150" y="56" width="22" height="20" rx="4" fill="#4faf6a" />
      </g>
      <rect v-if="!done" x="176" y="112" width="14" height="30" rx="2" fill="#9b5de5" transform="rotate(-70 183 127)" />
    </g>

    <!-- door -->
    <g v-else-if="jobId === 'door'">
      <rect x="86" y="22" width="88" height="110" fill="#5d3a1f" />
      <rect x="92" y="28" width="76" height="104" fill="#f2e3c9" />
      <g :transform="done ? '' : 'rotate(-12 92 132) translate(-10 0)'">
        <rect x="92" y="28" width="76" height="104" rx="2" fill="#c98a4f" />
        <rect x="100" y="38" width="60" height="38" rx="3" fill="#b5773f" />
        <rect x="100" y="84" width="60" height="38" rx="3" fill="#b5773f" />
        <circle cx="158" cy="82" r="4" fill="#f0b429" />
        <rect v-if="done" x="90" y="40" width="6" height="14" rx="2" fill="#8b929c" />
        <rect v-if="done" x="90" y="104" width="6" height="14" rx="2" fill="#8b929c" />
      </g>
    </g>

    <!-- bike -->
    <g v-else-if="jobId === 'bike'">
      <circle cx="78" cy="104" r="24" fill="none" stroke="#2b2118" stroke-width="6" />
      <circle cx="78" cy="104" r="3" fill="#8b929c" />
      <g :transform="done ? '' : 'translate(30 22) rotate(-24 178 104)'">
        <circle cx="178" cy="104" r="24" fill="none" stroke="#2b2118" stroke-width="6" />
        <circle cx="178" cy="104" r="3" fill="#8b929c" />
      </g>
      <path d="M78 104 L110 66 L156 66 L178 104 M110 66 L128 104 L78 104 M128 104 L156 66" stroke="#e45b3a" stroke-width="6" fill="none" stroke-linejoin="round" />
      <path d="M156 66 L150 52 L164 50" stroke="#2b2118" stroke-width="5" fill="none" stroke-linecap="round" />
      <path d="M104 60 h16" stroke="#2b2118" stroke-width="6" stroke-linecap="round" />
    </g>

    <!-- cable -->
    <g v-else-if="jobId === 'cable'">
      <rect x="150" y="62" width="42" height="42" rx="8" fill="#f4f6f8" stroke="#c9ced6" stroke-width="3" />
      <circle cx="164" cy="83" r="4" fill="#2b2118" />
      <circle cx="178" cy="83" r="4" fill="#2b2118" />
      <circle cx="171" cy="70" r="3" :fill="done ? '#4faf6a' : '#e4572e'" />
      <path
        v-if="done"
        d="M40 0 C40 60 100 100 150 83"
        stroke="#2b2118"
        stroke-width="6"
        fill="none"
      />
      <template v-else>
        <path d="M40 0 C40 50 70 80 96 96" stroke="#2b2118" stroke-width="6" fill="none" />
        <path d="M96 96 l8 2 M96 96 l5 7" stroke="#d98b3a" stroke-width="3" />
        <path d="M108 86 l8 -6 l-2 8 l8 -4" stroke="#ffd23f" stroke-width="3" fill="none" />
      </template>
    </g>

    <!-- fence -->
    <g v-else-if="jobId === 'fence'">
      <rect x="20" y="78" width="220" height="10" :fill="done ? '#3f9a5c' : '#b9b2a6'" />
      <rect x="20" y="104" width="220" height="10" :fill="done ? '#3f9a5c' : '#b9b2a6'" />
      <g v-for="post in FENCE_POSTS" :key="`post-${post}`">
        <path
          :d="`M${30 + post * 32} 130 v-62 l10 -12 l10 12 v62 z`"
          :fill="done ? '#4faf6a' : '#cfc8bb'"
          :stroke="done ? '#3f9a5c' : '#a39b8d'"
          stroke-width="2"
        />
        <path v-if="!done" :d="`M${36 + post * 32} 84 l4 10 l-3 8`" stroke="#a39b8d" stroke-width="1.5" fill="none" />
      </g>
    </g>

    <!-- done star -->
    <g v-if="done" class="hm-star" transform="translate(228 30)">
      <path d="M0 -18 L5 -6 L18 -6 L8 2 L12 15 L0 7 L-12 15 L-8 2 L-18 -6 L-5 -6 Z" fill="#ffd23f" stroke="#c99a2e" stroke-width="2" />
    </g>
  </svg>
</template>

<style scoped>
.hm-star {
  animation: hm-star-pop 0.5s ease-out both;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes hm-star-pop {
  0% { transform: translate(228px, 30px) scale(0); }
  70% { transform: translate(228px, 30px) scale(1.3); }
  100% { transform: translate(228px, 30px) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .hm-star { animation: none; }
}
</style>
