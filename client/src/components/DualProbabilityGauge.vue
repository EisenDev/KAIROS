<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  longProb: number;
  shortProb: number;
  riskLevel: string;
  size?: number;
}>();

const size = computed(() => props.size || 110);
const radius = computed(() => (size.value - 20) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);

function getDashOffset(prob: number) {
  const progress = prob / 100;
  return circumference.value * (1 - progress);
}

function getColor(prob: number) {
  if (prob >= 80) return 'var(--color-neon-green)';
  if (prob >= 70) return 'var(--color-neon-amber)';
  if (prob >= 60) return 'var(--color-neon-red)';
  return 'var(--color-text-muted)';
}

function getGlow(prob: number) {
  if (prob >= 80) return 'rgba(52, 211, 153, 0.4)';
  if (prob >= 70) return 'rgba(251, 191, 36, 0.4)';
  if (prob >= 60) return 'rgba(248, 113, 113, 0.4)';
  return 'rgba(148, 163, 184, 0.2)';
}

const longStroke = computed(() => getColor(props.longProb));
const shortStroke = computed(() => getColor(props.shortProb));
const longGlow = computed(() => getGlow(props.longProb));
const shortGlow = computed(() => getGlow(props.shortProb));

const riskColorClass = computed(() => {
  if (props.riskLevel.includes('LOW')) return 'text-[var(--color-neon-green)]';
  if (props.riskLevel.includes('MEDIUM')) return 'text-[var(--color-neon-amber)]';
  if (props.riskLevel.includes('HIGH')) return 'text-[var(--color-neon-red)]';
  return 'text-[var(--color-text-muted)]';
});
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <div class="flex items-center justify-center gap-6">
      
      <!-- Long Gauge -->
      <div class="flex flex-col items-center gap-2">
        <div class="relative" :style="{ width: size + 'px', height: size + 'px' }">
          <svg :width="size" :height="size" class="transform -rotate-90">
            <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="rgba(255,255,255,0.05)" :stroke-width="6" />
            <circle
              :cx="size / 2" :cy="size / 2" :r="radius" fill="none"
              :stroke="longStroke" :stroke-width="6" stroke-linecap="round"
              :stroke-dasharray="circumference" :stroke-dashoffset="getDashOffset(longProb)"
              class="transition-all duration-1000 ease-out"
              :style="{ filter: `drop-shadow(0 0 8px ${longGlow})` }"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xl font-bold tabular-nums" :style="{ color: longStroke, textShadow: `0 0 10px ${longGlow}` }">
              {{ longProb.toFixed(0) }}%
            </span>
            <span class="text-[8px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">Long</span>
          </div>
        </div>
      </div>

      <!-- Short Gauge -->
      <div class="flex flex-col items-center gap-2">
        <div class="relative" :style="{ width: size + 'px', height: size + 'px' }">
          <svg :width="size" :height="size" class="transform -rotate-90">
            <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="rgba(255,255,255,0.05)" :stroke-width="6" />
            <circle
              :cx="size / 2" :cy="size / 2" :r="radius" fill="none"
              :stroke="shortStroke" :stroke-width="6" stroke-linecap="round"
              :stroke-dasharray="circumference" :stroke-dashoffset="getDashOffset(shortProb)"
              class="transition-all duration-1000 ease-out"
              :style="{ filter: `drop-shadow(0 0 8px ${shortGlow})` }"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xl font-bold tabular-nums" :style="{ color: shortStroke, textShadow: `0 0 10px ${shortGlow}` }">
              {{ shortProb.toFixed(0) }}%
            </span>
            <span class="text-[8px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">Short</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Overall Risk Tier Label -->
    <div :class="['text-[11px] font-bold tracking-[0.2em] uppercase', riskColorClass]">
      [[ {{ riskLevel }} ]]
    </div>
  </div>
</template>
