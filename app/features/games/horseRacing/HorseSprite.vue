<script setup lang="ts">
import { computed } from 'vue'
import {
  HORSE_COATS,
  HORSE_POSES,
  segment,
  type HorseCoatName,
  type HorsePoseName,
  type LegPoints,
} from './sprite'

/** Side-view race horse with jockey. Renders an SVG <g>; use inside an <svg>. */
const props = withDefaults(defineProps<{
  coat?: HorseCoatName
  silk: string
  silkAccent?: string
  number: number
  pose?: HorsePoseName
  /** height above ground in sprite units (shadow stays on the ground) */
  lift?: number
}>(), {
  coat: 'bay',
  silkAccent: '#fff6e8',
  pose: 'stand',
  lift: 0,
})

const c = computed(() => HORSE_COATS[props.coat])
const p = computed(() => HORSE_POSES[props.pose])
const bodyDy = computed(() => p.value.dy - props.lift)
const shadowScale = computed(() => Math.max(0.45, 1 - props.lift / 160))

function legParts(points: LegPoints, far: boolean) {
  const [p0, p1, p2, p3] = points
  const col = far ? c.value.shade : c.value.body
  return {
    upper: segment(p0, p1),
    middle: segment(p1, p2),
    lower: segment(p2, p3),
    knee: p1,
    hoof: p3,
    col,
    low: far ? c.value.mane : c.value.lower,
  }
}

const farLegs = computed(() => [legParts(p.value.ff, true), legParts(p.value.hf, true)])
const nearLegs = computed(() => [legParts(p.value.fn, false), legParts(p.value.hn, false)])
</script>

<template>
  <g class="horse-sprite">
    <ellipse
      cx="96"
      cy="126"
      :rx="58 * shadowScale"
      :ry="7 * shadowScale"
      fill="rgba(60,40,20,0.28)"
    />
    <g :transform="`translate(0 ${bodyDy})`">
      <g v-for="(leg, i) in farLegs" :key="`far-${i}`">
        <path :d="leg.upper" :stroke="leg.col" stroke-width="13" stroke-linecap="round" />
        <path :d="leg.middle" :stroke="leg.col" stroke-width="7" stroke-linecap="round" />
        <path :d="leg.lower" :stroke="leg.low" stroke-width="6" stroke-linecap="round" />
        <circle :cx="leg.knee[0]" :cy="leg.knee[1]" r="4.6" :fill="leg.col" />
        <ellipse :cx="leg.hoof[0] + 1" :cy="leg.hoof[1] + 1" rx="5" ry="3.6" fill="#1a1411" />
      </g>

      <g class="horse-tail">
        <path d="M50 56 C36 52 22 60 12 76 C20 74 26 77 28 84 C32 72 40 66 52 66 Z" :fill="c.mane" />
        <path d="M48 58 C34 58 26 68 22 80" :stroke="c.mane" stroke-width="3" fill="none" opacity="0.7" />
      </g>

      <path
        d="M46 60 C46 44 68 36 96 38 C118 39 132 42 142 52 C148 60 146 76 136 82 C120 90 80 92 62 87 C50 84 44 74 46 60 Z"
        :fill="c.body"
      />
      <path d="M58 84 C80 90 118 89 136 82 C130 88 110 92 84 92 C72 91 64 89 58 84 Z" :fill="c.shade" opacity="0.7" />
      <path d="M120 48 C128 30 140 16 154 11 L170 22 C162 32 152 48 146 66 C138 64 128 58 120 48 Z" :fill="c.body" />
      <path d="M150 8 C160 3 172 6 178 14 L192 33 C195 39 191 45 185 44 L172 41 C165 39 158 31 154 24 Z" :fill="c.body" />
      <path d="M186 36 C190 38 192 42 188 44 L180 43 Z" :fill="c.shade" />
      <path
        v-if="c.blaze"
        d="M168 10 C172 14 180 24 186 34 L183 36 C177 27 171 18 166 12 Z"
        fill="#f4ede2"
      />
      <path d="M156 9 L158 -3 L164 7 Z" :fill="c.body" />
      <path d="M158 6 L159 0 L162 6 Z" :fill="c.shade" />
      <circle cx="168" cy="18" r="2.6" fill="#120d0a" />
      <circle cx="168.8" cy="17.2" r="0.8" fill="#fff" />
      <ellipse cx="187" cy="38" rx="1.8" ry="1.2" fill="#120d0a" />

      <g class="horse-mane">
        <path
          d="M152 6 C140 10 130 24 120 44 L114 40 L122 36 L118 30 L128 26 L124 20 L134 16 L132 10 L142 9 Z"
          :fill="c.mane"
        />
        <path d="M156 6 C160 2 164 4 162 10 L156 12 Z" :fill="c.mane" />
      </g>

      <path d="M160 14 L178 34 M166 26 L184 38" stroke="#3a2416" stroke-width="2" fill="none" />
      <path d="M176 32 C160 30 140 24 126 22" stroke="#3a2416" stroke-width="1.6" fill="none" />

      <path d="M78 40 L112 40 L116 66 L74 66 Z" :fill="silk" stroke="#fff" stroke-width="2" />
      <text
        x="95"
        y="61"
        text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif"
        font-weight="900"
        font-size="17"
        fill="#fff"
      >{{ number }}</text>
      <path d="M84 36 C92 32 104 32 110 37 L108 42 L84 42 Z" fill="#3a2416" />

      <path
        d="M98 38 L112 44 L104 54 L98 50"
        stroke="#f4ede2"
        stroke-width="7"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
      <path d="M103 53 L97 54" stroke="#1d1410" stroke-width="7" stroke-linecap="round" />
      <path d="M90 36 C92 22 106 12 122 13 L126 22 C114 24 104 30 102 40 Z" :fill="silk" />
      <path d="M100 26 L112 18 L116 24 L104 32 Z" :fill="silkAccent" opacity="0.85" />
      <path d="M118 18 L134 24 L140 26" :stroke="silk" stroke-width="6" stroke-linecap="round" fill="none" />
      <circle cx="141" cy="26" r="3.4" fill="#f2c9a0" />
      <circle cx="126" cy="9" r="8.5" :fill="silk" />
      <path d="M118 8 A8.5 8.5 0 0 1 134 6" :stroke="silkAccent" stroke-width="3" fill="none" />
      <path d="M131 12 L137 13" stroke="#1d1410" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="132" cy="14" r="3.3" fill="#f2c9a0" />

      <g v-for="(leg, i) in nearLegs" :key="`near-${i}`">
        <path :d="leg.upper" :stroke="leg.col" stroke-width="13" stroke-linecap="round" />
        <path :d="leg.middle" :stroke="leg.col" stroke-width="7" stroke-linecap="round" />
        <path :d="leg.lower" :stroke="leg.low" stroke-width="6" stroke-linecap="round" />
        <circle :cx="leg.knee[0]" :cy="leg.knee[1]" r="4.6" :fill="leg.col" />
        <ellipse :cx="leg.hoof[0] + 1" :cy="leg.hoof[1] + 1" rx="5" ry="3.6" fill="#1a1411" />
      </g>
    </g>
  </g>
</template>
