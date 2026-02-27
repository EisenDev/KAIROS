<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — Price Chart
// Lightweight Charts v5 — S/R overlays, scanning animation,
// real-time price stream
// ============================================================

import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  createChart, CandlestickSeries, HistogramSeries,
  type IChartApi, type ISeriesApi
} from 'lightweight-charts';
import SRExplainer from './SRExplainer.vue';

const props = defineProps<{
  symbol: string;
  binanceInterval?: string;
  supportLevels?: number[];
  resistanceLevels?: number[];
  isScanning?: boolean;
}>();

const chartContainer = ref<HTMLElement | null>(null);
const isLoading = ref(false);
const lastPrice = ref<number>(0);
const priceChange = ref<number>(0);
const chartError = ref<string | null>(null);

let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;
let volumeSeries: ISeriesApi<'Histogram'> | null = null;
let resizeObserver: ResizeObserver | null = null;
let refreshTimer: ReturnType<typeof setInterval>;
let priceLines: any[] = [];

// Track last candle for real-time updates (prevents tiny candle spam)
let lastCandleTime: number = 0;
let lastCandleOpen: number = 0;
let lastCandleHigh: number = 0;
let lastCandleLow: number = Infinity;

function initChart(): void {
  if (!chartContainer.value) return;
  destroyChart();

  const container = chartContainer.value;
  const rect = container.getBoundingClientRect();
  const width = rect.width || container.clientWidth || 800;
  const height = rect.height || container.clientHeight || 350;

  chart = createChart(container, {
    width,
    height,
    layout: {
      background: { color: 'transparent' },
      textColor: '#64748b',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
    grid: {
      vertLines: { color: 'rgba(0, 240, 255, 0.03)' },
      horzLines: { color: 'rgba(0, 240, 255, 0.03)' },
    },
    crosshair: {
      vertLine: { color: 'rgba(0, 240, 255, 0.2)', labelBackgroundColor: '#0d0d14' },
      horzLine: { color: 'rgba(0, 240, 255, 0.2)', labelBackgroundColor: '#0d0d14' },
    },
    rightPriceScale: {
      borderColor: 'rgba(0, 240, 255, 0.06)',
      scaleMargins: { top: 0.05, bottom: 0.2 },
    },
    timeScale: {
      borderColor: 'rgba(0, 240, 255, 0.06)',
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: { vertTouchDrag: false },
  });

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#00ff88',
    downColor: '#ff3366',
    borderUpColor: '#00ff88',
    borderDownColor: '#ff3366',
    wickUpColor: 'rgba(0, 255, 136, 0.6)',
    wickDownColor: 'rgba(255, 51, 102, 0.6)',
  });

  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  });

  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0.85, bottom: 0 },
  });

  resizeObserver = new ResizeObserver((entries) => {
    if (!chart || !entries[0]) return;
    const { width: w, height: h } = entries[0].contentRect;
    if (w > 0 && h > 0) chart.applyOptions({ width: w, height: h });
  });
  resizeObserver.observe(container);
}

async function loadData(): Promise<void> {
  if (!candleSeries || !volumeSeries) return;
  isLoading.value = true;
  chartError.value = null;

  try {
    const interval = props.binanceInterval || '1m';
    const res = await fetch(`/api/market/klines?symbol=${props.symbol}&interval=${interval}&limit=500`);
    if (!res.ok) throw new Error(`Kline fetch failed: ${res.status}`);

    const data = await res.json();
    const klines = data.klines;
    if (!klines || klines.length === 0) { chartError.value = 'No data'; return; }

    const candleData = klines.map((k: any) => ({
      time: k.time as number,
      open: k.open, high: k.high, low: k.low, close: k.close,
    }));

    const volumeData = klines.map((k: any) => ({
      time: k.time as number,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 51, 102, 0.15)',
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    const last = klines[klines.length - 1];
    const first = klines[0];
    lastPrice.value = last.close;
    priceChange.value = ((last.close - first.open) / first.open) * 100;

    // Store last candle info for real-time updates
    lastCandleTime = last.time;
    lastCandleOpen = last.open;
    lastCandleHigh = last.high;
    lastCandleLow = last.low;

    chart?.timeScale().fitContent();
  } catch (err: any) {
    chartError.value = err.message;
  } finally {
    isLoading.value = false;
  }
}

// ─── Support / Resistance Price Lines ─────────────────────

function drawSRLines(): void {
  clearSRLines();
  if (!candleSeries) return;

  // Draw support lines (green)
  if (props.supportLevels?.length) {
    for (let i = 0; i < props.supportLevels.length; i++) {
      const level = props.supportLevels[i];
      if (!level || level <= 0) continue;
      try {
        const line = candleSeries.createPriceLine({
          price: level,
          color: 'rgba(0, 255, 136, 0.5)',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `S${i + 1}`,
        });
        priceLines.push(line);
      } catch { /* ignore */ }
    }
  }

  // Draw resistance lines (red)
  if (props.resistanceLevels?.length) {
    for (let i = 0; i < props.resistanceLevels.length; i++) {
      const level = props.resistanceLevels[i];
      if (!level || level <= 0) continue;
      try {
        const line = candleSeries.createPriceLine({
          price: level,
          color: 'rgba(255, 51, 102, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `R${i + 1}`,
        });
        priceLines.push(line);
      } catch { /* ignore */ }
    }
  }
}

function clearSRLines(): void {
  if (!candleSeries) return;
  for (const line of priceLines) {
    try { candleSeries.removePriceLine(line); } catch { /* ignore */ }
  }
  priceLines = [];
}

// ─── Real-time Price Update ───────────────────────────────

function updateLastCandle(price: number): void {
  if (!candleSeries || !price || !lastCandleTime) return;
  lastPrice.value = price;

  // Update high/low tracking
  lastCandleHigh = Math.max(lastCandleHigh, price);
  lastCandleLow = Math.min(lastCandleLow, price);

  try {
    // Reuse the SAME timestamp = updates existing candle (no new candle)
    candleSeries.update({
      time: lastCandleTime as any,
      open: lastCandleOpen,
      high: lastCandleHigh,
      low: lastCandleLow,
      close: price,
    });
  } catch { /* ignore */ }
}

// ─── Watchers ─────────────────────────────────────────────

watch(() => [props.supportLevels, props.resistanceLevels], () => {
  drawSRLines();
}, { deep: true });

watch(() => props.symbol, async () => {
  await nextTick();
  initChart();
  await loadData();
});

watch(() => props.binanceInterval, async () => {
  await loadData();
});

function destroyChart(): void {
  clearSRLines();
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (chart) { chart.remove(); chart = null; candleSeries = null; volumeSeries = null; }
}

onMounted(async () => {
  await nextTick();
  requestAnimationFrame(async () => {
    initChart();
    await loadData();
  });
  refreshTimer = setInterval(loadData, 30000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  destroyChart();
});

function formatPrice(p: number): string {
  if (p > 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p > 1) return p.toFixed(4);
  return p.toFixed(5);
}

defineExpose({ updateLastCandle });
</script>

<template>
  <div class="glass-panel h-full flex flex-col relative" style="min-height: 300px; padding: 12px 14px;">
    <!-- Scanning overlay -->
    <div v-if="isScanning" class="absolute inset-0 z-20 pointer-events-none rounded-[10px] overflow-hidden">
      <div class="scan-line"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span class="text-[10px] text-[var(--color-neon-cyan)] font-medium tracking-[0.15em] animate-pulse">
          Analyzing…
        </span>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between mb-2 shrink-0">
      <div class="flex items-center gap-2.5">
        <span class="text-[11px] font-semibold text-[var(--color-text-primary)]">{{ symbol }}</span>
        <span class="text-[10px] text-[var(--color-text-muted)] font-mono">{{ binanceInterval || '1m' }}</span>
        <span v-if="lastPrice" class="text-[12px] font-mono font-semibold tabular-nums text-[var(--color-text-secondary)]">
          {{ formatPrice(lastPrice) }}
        </span>
        <span v-if="priceChange !== 0"
          :class="['text-[10px] font-mono tabular-nums font-medium px-1.5 py-0.5 rounded-md',
            priceChange >= 0
              ? 'text-[var(--color-neon-green)] bg-[rgba(52,211,153,0.08)]'
              : 'text-[var(--color-neon-red)] bg-[rgba(248,113,113,0.08)]']">
          {{ priceChange >= 0 ? '+' : '' }}{{ priceChange.toFixed(2) }}%
        </span>
      </div>
      <div class="flex items-center gap-2">
        <div v-if="supportLevels?.length || resistanceLevels?.length"
          class="text-[9px] text-[var(--color-text-muted)] font-medium">
          S/R
        </div>
        <div :class="['status-dot', isLoading ? 'bg-[var(--color-neon-amber)] status-dot--pulse' : 'status-dot--online']"></div>
      </div>
    </div>

    <!-- Chart Area -->
    <div class="flex-1 relative" style="min-height: 260px;">
      <div ref="chartContainer" class="absolute inset-0"></div>

      <!-- S/R Guide Widget — positioned near the TradingView logo (bottom-left) -->
      <div class="absolute bottom-2 left-10 z-15">
        <SRExplainer />
      </div>

      <!-- Loading -->
      <div v-if="isLoading && !lastPrice" class="absolute inset-0 flex items-center justify-center bg-[rgba(8,8,12,0.7)] z-10 rounded-[10px]">
        <div class="text-center">
          <div class="text-sm animate-pulse-glow mb-2">📊</div>
          <span class="text-[10px] text-[var(--color-text-muted)]">Loading…</span>
        </div>
      </div>

      <!-- Error -->
      <div v-if="chartError" class="absolute inset-0 flex items-center justify-center bg-[rgba(8,8,12,0.7)] z-10 rounded-[10px]">
        <div class="text-center">
          <div class="text-sm mb-2">⚠️</div>
          <span class="text-[10px] text-[var(--color-neon-red)]">{{ chartError }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-neon-cyan), transparent);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.15);
  animation: scanDown 3s ease-in-out infinite;
  z-index: 30;
}
@keyframes scanDown {
  0% { top: 0%; opacity: 0.6; }
  50% { top: 95%; opacity: 0.8; }
  100% { top: 0%; opacity: 0.6; }
}
</style>
