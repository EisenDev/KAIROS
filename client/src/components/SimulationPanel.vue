<script setup lang="ts">
// ============================================================
// KAIROS PRO — Simulation Panel
// Monte Carlo path distribution visualization
// ============================================================

import { computed } from 'vue';
import type { TradeVerdict } from '../types';

const props = defineProps<{
  verdict: TradeVerdict | null;
}>();

const stats = computed(() => {
  if (!props.verdict) return null;
  const v = props.verdict;
  const spread = ((v.take_profit - v.stop_loss) / v.entry_price * 100).toFixed(2);
  const tpDistance = ((v.take_profit - v.entry_price) / v.entry_price * 100).toFixed(2);
  const slDistance = ((v.entry_price - v.stop_loss) / v.entry_price * 100).toFixed(2);
  
  return {
    spread,
    tpDistance: v.direction === 'LONG' ? `+${tpDistance}` : `-${tpDistance}`,
    slDistance: v.direction === 'LONG' ? `-${slDistance}` : `+${slDistance}`,
    winRate: v.simulation_meta.winning_paths,
    lossRate: v.simulation_meta.total_simulations - v.simulation_meta.winning_paths,
    total: v.simulation_meta.total_simulations,
  };
});

const winBarWidth = computed(() => {
  if (!props.verdict) return '0%';
  return `${(props.verdict.simulation_meta.winning_paths / props.verdict.simulation_meta.total_simulations) * 100}%`;
});
</script>

<template>
  <div class="glass-panel p-4 h-full flex flex-col">
    <h3 class="text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)] font-bold uppercase mb-4">
      Monte Carlo Distribution
    </h3>

    <template v-if="verdict && stats">
      <!-- Path Distribution Bar -->
      <div class="mb-4">
        <div class="flex justify-between text-[9px] text-[var(--color-text-muted)] mb-1.5">
          <span>WINNING PATHS</span>
          <span>{{ stats.winRate }} / {{ stats.total }}</span>
        </div>
        <div class="w-full h-3 bg-[rgba(0,0,0,0.4)] rounded-full overflow-hidden">
          <div 
            class="h-full rounded-full transition-all duration-1000 ease-out"
            :style="{ 
              width: winBarWidth,
              background: verdict.probability >= 80 
                ? 'linear-gradient(90deg, var(--color-neon-green), var(--color-neon-cyan))'
                : verdict.probability >= 65 
                  ? 'linear-gradient(90deg, var(--color-neon-amber), #ff8800)'
                  : 'linear-gradient(90deg, var(--color-hold), #4b5563)'
            }"
          ></div>
        </div>
      </div>

      <!-- Price Targets Visualization -->
      <div class="flex-1 space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--color-text-muted)]">TP Distance</span>
          <span class="neon-text-green tabular-nums font-bold">{{ stats.tpDistance }}%</span>
        </div>
        
        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--color-text-muted)]">SL Distance</span>
          <span class="neon-text-red tabular-nums font-bold">{{ stats.slDistance }}%</span>
        </div>

        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--color-text-muted)]">Price Spread</span>
          <span class="text-[var(--color-text-secondary)] tabular-nums">{{ stats.spread }}%</span>
        </div>

        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--color-text-muted)]">Mode Target</span>
          <span class="neon-text-cyan tabular-nums">${{ verdict.simulation_meta.mode_target.toLocaleString() }}</span>
        </div>

        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--color-text-muted)]">Risk Floor</span>
          <span class="text-[var(--color-text-secondary)] tabular-nums">${{ verdict.simulation_meta.floor_price.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Simulation count -->
      <div class="mt-4 pt-3 border-t border-[rgba(0,240,255,0.06)] text-center">
        <span class="text-[9px] text-[var(--color-text-muted)] tracking-wider">
          {{ stats.total }} PATHS SIMULATED
        </span>
      </div>
    </template>

    <template v-else>
      <div class="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-xs">
        <div class="text-center">
          <div class="text-2xl mb-2">🎲</div>
          <div>No simulation data</div>
        </div>
      </div>
    </template>
  </div>
</template>
