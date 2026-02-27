<script setup lang="ts">
// ============================================================
// KAIROS PRO — Probability Gauge
// Circular gauge showing win probability with conviction coloring
// ============================================================

import { computed } from 'vue';

const props = defineProps<{
  probability: number;
  size?: number;
}>();

const size = computed(() => props.size || 180);
const radius = computed(() => (size.value - 20) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const dashOffset = computed(() => {
  const progress = props.probability / 100;
  return circumference.value * (1 - progress);
});

const strokeColor = computed(() => {
  if (props.probability >= 80) return 'var(--color-execute)';
  if (props.probability >= 65) return 'var(--color-caution)';
  return 'var(--color-hold)';
});

const glowColor = computed(() => {
  if (props.probability >= 80) return 'rgba(0,255,136,0.4)';
  if (props.probability >= 65) return 'rgba(255,170,0,0.4)';
  return 'rgba(107,114,128,0.2)';
});

const label = computed(() => {
  if (props.probability >= 80) return 'EXECUTE';
  if (props.probability >= 65) return 'CAUTION';
  return 'HOLD';
});

const labelClass = computed(() => {
  if (props.probability >= 80) return 'neon-text-green';
  if (props.probability >= 65) return 'neon-text-amber';
  return 'text-[var(--color-text-muted)]';
});
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div class="relative" :style="{ width: size + 'px', height: size + 'px' }">
      <!-- Background ring -->
      <svg :width="size" :height="size" class="transform -rotate-90">
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          stroke="rgba(0,240,255,0.06)"
          :stroke-width="8"
        />
        <!-- Progress ring -->
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          :stroke="strokeColor"
          :stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          class="transition-all duration-1000 ease-out"
          :style="{ filter: `drop-shadow(0 0 8px ${glowColor})` }"
        />
      </svg>

      <!-- Center text -->
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          class="text-3xl font-bold tabular-nums transition-colors duration-500"
          :style="{ color: strokeColor, textShadow: `0 0 20px ${glowColor}` }"
        >
          {{ probability.toFixed(1) }}%
        </span>
        <span class="text-[9px] tracking-[0.2em] text-[var(--color-text-muted)] mt-1">
          WIN PROBABILITY
        </span>
      </div>
    </div>

    <!-- Conviction label -->
    <div :class="['text-xs font-bold tracking-[0.3em]', labelClass]">
      STATUS: {{ label }}
    </div>
  </div>
</template>
