<script setup lang="ts">
// ============================================================
// KAIROS PRO — Signal Feed
// Rolling feed of trade signals and system events
// ============================================================

import { computed } from 'vue';
import type { TradeVerdict } from '../types';

const props = defineProps<{
  signals: TradeVerdict[];
}>();

const sortedSignals = computed(() => 
  [...props.signals].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
);



function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getRiskColorClass(risk: string): string {
  if (!risk) return 'text-[var(--color-text-muted)]';
  if (risk.includes('LOW')) return 'text-[var(--color-neon-green)]';
  if (risk.includes('MEDIUM')) return 'text-[var(--color-neon-amber)]';
  if (risk.includes('HIGH')) return 'text-[var(--color-neon-red)]';
  return 'text-[var(--color-text-muted)]';
}
</script>

<template>
  <div class="glass-panel p-4 h-full flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)] font-bold uppercase">
        Signal Feed
      </h3>
      <span class="text-[9px] text-[var(--color-text-muted)]">
        {{ signals.length }} signals
      </span>
    </div>

    <div class="flex-1 overflow-y-auto space-y-1.5 pr-1">
      <div
        v-for="signal in sortedSignals"
        :key="signal.id"
        class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[rgba(0,240,255,0.03)] transition-colors text-[11px]"
      >
        <span class="text-sm">○</span>
        <span class="text-[var(--color-text-muted)] tabular-nums text-[10px] w-14 shrink-0">
          {{ formatTime(signal.timestamp) }}
        </span>
        <span class="font-bold w-20 shrink-0 uppercase tracking-tight" :class="getRiskColorClass(signal.risk_level)">
          {{ signal.risk_level?.split(' ')[0] || 'NEUTRAL' }}
        </span>
        <span class="text-[var(--color-text-secondary)] w-14">{{ signal.symbol }}</span>
        <span class="w-10 text-center font-bold" :class="signal.direction === 'LONG' ? 'text-[var(--color-neon-green)]' : signal.direction === 'SHORT' ? 'text-[var(--color-neon-red)]' : 'text-[var(--color-text-muted)]'">
          {{ signal.direction === 'HOLD' ? 'HLD' : signal.direction === 'LONG' ? 'LNG' : 'SRT' }}
        </span>
        <span class="ml-auto tabular-nums font-mono text-[10px]" :class="getRiskColorClass(signal.risk_level)">
          {{ Math.max(signal.long_prob || 50, signal.short_prob || 50).toFixed(0) }}%
        </span>
      </div>

      <div v-if="signals.length === 0" class="text-center py-8 text-[var(--color-text-muted)] text-xs">
        <div class="text-2xl mb-2">📡</div>
        <div>Awaiting signals...</div>
        <div class="text-[10px] mt-1">Monte Carlo engine initializing</div>
      </div>
    </div>
  </div>
</template>
