<script setup lang="ts">
// ============================================================
// KAIROS PRO — Trade Card
// Actionable trade signal display with Entry, TP, SL, Leverage
// ============================================================

import { computed } from 'vue';
import type { TradeVerdict } from '../types';

const props = defineProps<{
  verdict: TradeVerdict;
}>();

const cardBorderColor = computed(() => {
  switch (props.verdict.status) {
    case 'EXECUTE': return 'border-[var(--color-execute)]';
    case 'CAUTION': return 'border-[var(--color-caution)]';
    default: return 'border-[var(--color-hold)]';
  }
});

const directionBg = computed(() => {
  return props.verdict.direction === 'LONG'
    ? 'bg-[rgba(0,255,136,0.1)] text-[var(--color-neon-green)]'
    : 'bg-[rgba(255,51,102,0.1)] text-[var(--color-neon-red)]';
});

const statusBg = computed(() => {
  switch (props.verdict.status) {
    case 'EXECUTE': return 'bg-[rgba(0,255,136,0.1)] text-[var(--color-execute)]';
    case 'CAUTION': return 'bg-[rgba(255,170,0,0.1)] text-[var(--color-caution)]';
    default: return 'bg-[rgba(107,114,128,0.1)] text-[var(--color-hold)]';
  }
});

const pulseClass = computed(() => {
  if (props.verdict.status === 'EXECUTE') return 'animate-signal-pulse';
  if (props.verdict.status === 'CAUTION') return 'animate-warning-pulse';
  return '';
});

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}
</script>

<template>
  <div 
    :class="[
      'glass-panel p-5 border-l-2 animate-fade-in',
      cardBorderColor,
      pulseClass,
    ]"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-[13px] font-bold text-[var(--color-text-primary)]">{{ verdict.symbol }}</span>
        <span :class="['px-2 py-0.5 rounded text-[9px] font-bold tracking-wider', directionBg]">
          {{ verdict.direction }}
        </span>
        <span :class="['px-2 py-0.5 rounded text-[9px] font-bold tracking-wider', statusBg]">
          {{ verdict.status }}
        </span>
      </div>
      <div class="text-[9px] text-[var(--color-text-muted)] font-mono tabular-nums">
        {{ verdict.id }} · {{ verdict.timeframe }}
      </div>
    </div>

    <!-- Trade Parameters Grid for Active Trades -->
    <div v-if="verdict.direction !== 'HOLD' && verdict.status !== 'HOLD'" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div class="rounded-lg p-3" style="background: rgba(148, 163, 184, 0.05);">
        <div class="text-[9px] text-[var(--color-text-muted)] tracking-[0.05em] uppercase font-semibold mb-1">Entry</div>
        <div class="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
          ${{ formatPrice(verdict.entry_price) }}
        </div>
      </div>
      <div class="rounded-lg p-3" style="background: rgba(52, 211, 153, 0.05);">
        <div class="text-[9px] text-[var(--color-neon-green)] tracking-[0.05em] uppercase font-semibold mb-1">Take Profit</div>
        <div class="text-[13px] font-semibold text-[var(--color-neon-green)] tabular-nums">
          ${{ formatPrice(verdict.take_profit) }}
        </div>
      </div>
      <div class="rounded-lg p-3" style="background: rgba(248, 113, 113, 0.05);">
        <div class="text-[9px] text-[var(--color-neon-red)] tracking-[0.05em] uppercase font-semibold mb-1">Stop Loss</div>
        <div class="text-[13px] font-semibold text-[var(--color-neon-red)] tabular-nums">
          ${{ formatPrice(verdict.stop_loss) }}
        </div>
      </div>
      <div class="rounded-lg p-3" style="background: rgba(56, 189, 248, 0.05);">
        <div class="text-[9px] text-[var(--color-neon-cyan)] tracking-[0.05em] uppercase font-semibold mb-1">Leverage & Margin</div>
        <div class="text-[13px] font-semibold text-[var(--color-neon-cyan)] tabular-nums">
          {{ verdict.margin_percent }}% at {{ verdict.leverage }}x
        </div>
      </div>
    </div>

    <!-- HOLD State Box -->
    <div v-else class="rounded-lg p-4 mb-4 text-center border" style="background: rgba(148, 163, 184, 0.03); border-color: rgba(148, 163, 184, 0.08);">
      <div class="text-[11px] text-[var(--color-text-secondary)] font-medium">No actionable trade signal detected on this timeframe.</div>
      <div class="text-[9px] text-[var(--color-text-muted)] mt-1">Holding position and preserving capital according to 70% threshold constraints.</div>
    </div>

    <!-- Secondary Stats -->
    <div class="flex items-center gap-4 text-[10px] text-[var(--color-text-muted)] mb-3">
      <span>R:R <span class="text-[var(--color-text-secondary)]">{{ verdict.risk_reward_ratio }}</span></span>
      <span>•</span>
      <span>Margin <span class="text-[var(--color-text-secondary)]">{{ verdict.margin_percent }}%</span></span>
      <span>•</span>
      <span>Paths <span class="text-[var(--color-text-secondary)]">{{ verdict.simulation_meta.winning_paths }}/{{ verdict.simulation_meta.total_simulations }}</span></span>
      <span>•</span>
      <span>{{ formatTime(verdict.timestamp) }}</span>
    </div>

    <!-- Message -->
    <div class="text-xs text-[var(--color-text-secondary)] leading-relaxed border-t border-[rgba(0,240,255,0.06)] pt-3">
      {{ verdict.message }}
    </div>
  </div>
</template>
