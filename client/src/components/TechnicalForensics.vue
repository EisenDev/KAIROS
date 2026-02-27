<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.0 — Technical Forensics
// Displays Scraper's support/resistance and chart patterns
// ============================================================

import { computed } from 'vue';

interface ChartPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
}

interface ScraperData {
  support_levels: number[];
  resistance_levels: number[];
  chart_patterns: ChartPattern[];
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  key_levels_analysis: string;
  technical_summary: string;
  timestamp: string;
}

const props = defineProps<{
  scraper: ScraperData | null;
  currentPrice: number;
}>();

const trendColor = computed(() => {
  if (!props.scraper) return 'text-[var(--color-text-muted)]';
  if (props.scraper.trend === 'BULLISH') return 'neon-text-green';
  if (props.scraper.trend === 'BEARISH') return 'neon-text-red';
  return 'neon-text-amber';
});

const trendIcon = computed(() => {
  if (!props.scraper) return '—';
  if (props.scraper.trend === 'BULLISH') return '▲';
  if (props.scraper.trend === 'BEARISH') return '▼';
  return '◆';
});

function patternTypeColor(type: string): string {
  if (type === 'bullish') return 'text-[var(--color-neon-green)] bg-[rgba(0,255,136,0.08)]';
  if (type === 'bearish') return 'text-[var(--color-neon-red)] bg-[rgba(255,51,102,0.08)]';
  return 'text-[var(--color-neon-amber)] bg-[rgba(255,170,0,0.08)]';
}

function confidenceBar(conf: number): string {
  return `${Math.round(conf * 100)}%`;
}

function formatPrice(price: number): string {
  if (price > 1000) return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price > 1) return '$' + price.toFixed(4);
  return '$' + price.toFixed(5);
}

function distancePercent(level: number): string {
  if (!props.currentPrice || !level) return '';
  const pct = ((level - props.currentPrice) / props.currentPrice * 100).toFixed(2);
  return `${parseFloat(pct) > 0 ? '+' : ''}${pct}%`;
}
</script>

<template>
  <div class="glass-panel p-4 h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-sm">🔍</span>
        <h3 class="text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)] font-bold uppercase">
          Technical Forensics
        </h3>
      </div>
      <div v-if="scraper" :class="['text-xs font-bold flex items-center gap-1', trendColor]">
        <span>{{ trendIcon }}</span>
        <span>{{ scraper.trend }}</span>
      </div>
    </div>

    <div v-if="scraper" class="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
      <!-- Support & Resistance Grid -->
      <div class="grid grid-cols-2 gap-2">
        <!-- Resistance -->
        <div>
          <div class="text-[9px] text-[var(--color-neon-red)] tracking-wider mb-1.5 font-bold">RESISTANCE</div>
          <div class="space-y-1">
            <div v-for="(level, i) in scraper.resistance_levels" :key="'r' + i"
              class="flex items-center justify-between py-1 px-2 rounded bg-[rgba(255,51,102,0.05)] border-l-2 border-[var(--color-neon-red)]">
              <span class="text-[11px] text-[var(--color-text-primary)] tabular-nums font-medium">
                {{ formatPrice(level) }}
              </span>
              <span class="text-[9px] text-[var(--color-neon-red)] tabular-nums">
                {{ distancePercent(level) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Support -->
        <div>
          <div class="text-[9px] text-[var(--color-neon-green)] tracking-wider mb-1.5 font-bold">SUPPORT</div>
          <div class="space-y-1">
            <div v-for="(level, i) in scraper.support_levels" :key="'s' + i"
              class="flex items-center justify-between py-1 px-2 rounded bg-[rgba(0,255,136,0.05)] border-l-2 border-[var(--color-neon-green)]">
              <span class="text-[11px] text-[var(--color-text-primary)] tabular-nums font-medium">
                {{ formatPrice(level) }}
              </span>
              <span class="text-[9px] text-[var(--color-neon-green)] tabular-nums">
                {{ distancePercent(level) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart Patterns -->
      <div>
        <div class="text-[9px] text-[var(--color-text-muted)] tracking-wider mb-1.5">CHART PATTERNS</div>
        <div class="space-y-1.5">
          <div v-for="(pattern, i) in scraper.chart_patterns" :key="i"
            class="rounded bg-[rgba(0,0,0,0.2)] p-2">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span :class="['text-[9px] font-bold px-1.5 py-0.5 rounded uppercase', patternTypeColor(pattern.type)]">
                  {{ pattern.type }}
                </span>
                <span class="text-[11px] text-[var(--color-text-primary)] font-medium">{{ pattern.name }}</span>
              </div>
              <span class="text-[10px] text-[var(--color-neon-cyan)] tabular-nums">{{ confidenceBar(pattern.confidence) }}</span>
            </div>
            <!-- Confidence bar -->
            <div class="w-full h-1 bg-[rgba(0,0,0,0.3)] rounded-full mb-1">
              <div class="h-full rounded-full transition-all duration-500"
                :style="{ 
                  width: confidenceBar(pattern.confidence),
                  background: pattern.type === 'bullish' ? 'var(--color-neon-green)' : pattern.type === 'bearish' ? 'var(--color-neon-red)' : 'var(--color-neon-amber)'
                }"></div>
            </div>
            <div class="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{{ pattern.description }}</div>
          </div>
        </div>
      </div>

      <!-- Key Levels Analysis -->
      <div v-if="scraper.key_levels_analysis">
        <div class="text-[9px] text-[var(--color-text-muted)] tracking-wider mb-1">KEY LEVELS</div>
        <div class="text-[10px] text-[var(--color-text-secondary)] leading-relaxed bg-[rgba(0,0,0,0.15)] p-2 rounded">
          {{ scraper.key_levels_analysis }}
        </div>
      </div>

      <!-- Technical Summary -->
      <div v-if="scraper.technical_summary" class="border-t border-[rgba(0,240,255,0.06)] pt-2">
        <div class="text-[9px] text-[var(--color-text-muted)] tracking-wider mb-1">SUMMARY</div>
        <div class="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
          {{ scraper.technical_summary }}
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center text-[var(--color-text-muted)]">
        <div class="text-2xl mb-2">🔍</div>
        <div class="text-xs">Awaiting technical scan...</div>
        <div class="text-[10px] mt-1">Run committee analysis to populate</div>
      </div>
    </div>
  </div>
</template>
