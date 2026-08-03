<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    size: 'md',
  },
)

const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-14 w-10',
  md: 'h-28 w-20 sm:h-36 sm:w-24',
  lg: 'h-32 w-[5.5rem] sm:h-40 sm:w-28',
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-[0.85rem] border-[3px] border-[#f4f0e6] shadow-[0_3px_0_rgba(43,33,24,0.45)]"
    :class="SIZE_CLASS[props.size]"
    style="background: linear-gradient(145deg, #8b1e2d 0%, #5c101c 55%, #3d0a12 100%)"
    aria-hidden="true"
  >
    <div
      class="absolute inset-[10%] rounded-[50%] border-2 border-[#f4f0e6]/35"
      style="transform: rotate(-18deg)"
    />
    <div
      class="absolute inset-[22%] rounded-[50%] border-2 border-[#f4f0e6]/25"
      style="transform: rotate(12deg)"
    />
    <div
      class="absolute inset-0 opacity-30"
      style="
        background-image:
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 6px,
            rgba(244, 240, 230, 0.15) 6px,
            rgba(244, 240, 230, 0.15) 7px
          );
      "
    />
    <div class="absolute inset-0 flex items-center justify-center">
      <span
        class="rotate-[-18deg] font-[var(--font-display)] text-[0.65rem] font-black tracking-widest text-[#f4f0e6]/90 sm:text-xs"
      >
        KARTEN
      </span>
    </div>
  </div>
</template>
