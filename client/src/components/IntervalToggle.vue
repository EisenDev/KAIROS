<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — Master Interval Toggle
// Timeframe selector with candle-close sync countdown
// ============================================================

import { ref, computed, onMounted, onUnmounted } from 'vue';

interface IntervalDef {
  label: string;
  value: string;
  ms: number;
  binanceInterval: string;
}

const INTERVALS: IntervalDef[] = [
  { label: '15m', value: '15m', ms: 900_000, binanceInterval: '15m' },
  { label: '30m', value: '30m', ms: 1_800_000, binanceInterval: '30m' },
  { label: '1h', value: '1h', ms: 3_600_000, binanceInterval: '1h' },
  { label: '4h', value: '4h', ms: 14_400_000, binanceInterval: '4h' },
  { label: '12h', value: '12h', ms: 43_200_000, binanceInterval: '12h' },
  { label: '24h', value: '24h', ms: 86_400_000, binanceInterval: '1d' },
  { label: '3d', value: '3d', ms: 259_200_000, binanceInterval: '3d' },
  { label: '7d', value: '7d', ms: 604_800_000, binanceInterval: '1w' },
  { label: '1mo', value: '1mo', ms: 2_592_000_000, binanceInterval: '1M' },
];

const props = defineProps<{ selected: string }>();
const emit = defineEmits<{
  (e: 'select', interval: string, binanceInterval: string, ms: number): void;
  (e: 'candle-close'): void;
}>();

const countdown = ref('');
const isNearClose = ref(false);
const progressPct = ref(0);
let timer: ReturnType<typeof setInterval>;
let hasTriggered = false;

const activeInterval = computed(() => INTERVALS.find(i => i.value === props.selected) || INTERVALS[0]);

function getNextCandleClose(intervalMs: number): number {
  const now = Date.now();
  return Math.ceil(now / intervalMs) * intervalMs;
}

function tick(): void {
  const intv = activeInterval.value;
  if (!intv) return;
  const nextClose = getNextCandleClose(intv.ms);
  const remaining = nextClose - Date.now();
  const elapsed = intv.ms - remaining;
  progressPct.value = Math.min(100, (elapsed / intv.ms) * 100);

  if (remaining <= 0) {
    countdown.value = 'NOW';
    isNearClose.value = true;
    hasTriggered = false;
    return;
  }

  // Format countdown
  const totalSec = Math.ceil(remaining / 1000);
  if (totalSec < 60) {
    countdown.value = `${totalSec}s`;
  } else if (totalSec < 3600) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    countdown.value = `${m}m ${s.toString().padStart(2, '0')}s`;
  } else {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    countdown.value = `${h}h ${m}m`;
  }

  // Candle-Close Sync: trigger within 10 seconds
  if (remaining <= 10000 && !hasTriggered) {
    isNearClose.value = true;
    hasTriggered = true;
    emit('candle-close');
  } else if (remaining > 10000) {
    isNearClose.value = false;
    hasTriggered = false;
  }
}

function selectInterval(intv: IntervalDef): void {
  hasTriggered = false;
  emit('select', intv.value, intv.binanceInterval, intv.ms);
}

onMounted(() => { timer = setInterval(tick, 1000); tick(); });
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="glass-panel px-4 py-2">
    <div class="flex items-center gap-4">
      <!-- Interval buttons -->
      <div class="flex gap-0.5 flex-1">
        <button
          v-for="intv in INTERVALS"
          :key="intv.value"
          @click="selectInterval(intv)"
          class="intv-btn"
          :class="intv.value === selected ? 'intv-btn--active' : 'intv-btn--idle'"
        >
          {{ intv.label }}
        </button>
      </div>

      <!-- Countdown + Progress -->
      <div class="flex items-center gap-2.5 shrink-0">
        <div class="w-14 h-[3px] bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :style="{
              width: progressPct + '%',
              background: isNearClose
                ? 'var(--color-neon-amber)'
                : 'var(--color-neon-cyan)'
            }"
          ></div>
        </div>
        <span
          :class="[
            'text-[10px] font-mono font-medium tabular-nums min-w-[48px] text-right',
            isNearClose ? 'text-[var(--color-neon-amber)]' : 'text-[var(--color-text-muted)]'
          ]"
        >{{ countdown }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intv-btn {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-sans);
  letter-spacing: 0.02em;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  background: transparent;
}

.intv-btn--idle {
  color: var(--color-text-muted);
}
.intv-btn--idle:hover {
  color: var(--color-text-secondary);
  background: rgba(148, 163, 184, 0.04);
}

.intv-btn--active {
  color: var(--color-neon-cyan);
  background: rgba(56, 189, 248, 0.08);
}
</style>
