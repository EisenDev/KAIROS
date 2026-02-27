<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — App.vue — The Execution Layer
// Master Interval Toggle + Candle-Close Sync + S/R Overlays
// Real-time Price Pulse + 70% Bi-Directional Signal
// ============================================================

import { ref, onMounted, watch, computed } from 'vue';
import { useWebSocket } from '../composables/useWebSocket';
import { useTradeAudio } from '../composables/useTradeAudio';

import SystemHeader from '../components/SystemHeader.vue';
import AssetSelector from '../components/AssetSelector.vue';
import IntervalToggle from '../components/IntervalToggle.vue';
import PriceChart from '../components/PriceChart.vue';
import DualProbabilityGauge from '../components/DualProbabilityGauge.vue';
import SignalHistoryModal from '../components/SignalHistoryModal.vue';
import TradeCard from '../components/TradeCard.vue';
import SignalFeed from '../components/SignalFeed.vue';
import IntelligenceTerminal from '../components/IntelligenceTerminal.vue';
import TechnicalForensics from '../components/TechnicalForensics.vue';
import FloatingWidget from '../components/FloatingWidget.vue';
import SettingsPanel from '../components/SettingsPanel.vue';

// ─── State ────────────────────────────────────────────────
const selectedSymbol = ref('BTCUSDT');
const selectedInterval = ref('15m');
const binanceInterval = ref('15m');
const intervalMs = ref(900_000);
const chartKey = ref(0);
const showHistoryModal = ref(false);
const isSimulating = ref(false);
const isScanning = ref(false);
const hubStatus = ref<'ONLINE' | 'DEGRADED' | 'OFFLINE'>('OFFLINE');
const brainStatus = ref<'ONLINE' | 'DEGRADED' | 'OFFLINE'>('OFFLINE');

// Committee state
const latestPrediction = ref<any>(null);
const scraperData = ref<any>(null);
const journalistData = ref<any>(null);
const watcherAlerts = ref<any[]>([]);
const signalHistory = ref<any[]>([]);
const livePriceData = ref<{ price: number; change: number }>({ price: 0, change: 0 });

// Floating widget state
const activeWidgets = ref<Record<string, boolean>>({
  liveNews: false,
  latestNews: false,
  tradeLog: false,
  miniChart: false,
});
const liveNewsUrl = ref('');
const settingsRef = ref<InstanceType<typeof SettingsPanel> | null>(null);

// Chart ref for real-time updates
const chartRef = ref<InstanceType<typeof PriceChart> | null>(null);

// ─── Composables ──────────────────────────────────────────
const { isConnected, onEvent } = useWebSocket();
const { isMuted, play, playSignal, toggleMute } = useTradeAudio();

// Committee countdown timer
const committeeCountdown = ref('--:--');
const committeeProgress = ref(0);
const isSynced = ref(false);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function startCountdownTimer(): void {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const ms = intervalMs.value;
    const now = Date.now();
    const nextClose = Math.ceil(now / ms) * ms;
    const remaining = nextClose - now;
    const elapsed = ms - remaining;
    committeeProgress.value = Math.min(100, (elapsed / ms) * 100);

    if (remaining <= 0) {
      committeeCountdown.value = '00:00';
      return;
    }
    const totalSec = Math.ceil(remaining / 1000);
    if (totalSec < 60) {
      committeeCountdown.value = `00:${totalSec.toString().padStart(2, '0')}`;
    } else if (totalSec < 3600) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      committeeCountdown.value = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      committeeCountdown.value = `${h}h ${m.toString().padStart(2, '0')}m`;
    }
  }, 1000);
}

// S/R levels from scraper (for chart overlay)
const supportLevels = computed(() => scraperData.value?.support_levels || []);
const resistanceLevels = computed(() => scraperData.value?.resistance_levels || []);

// ─── WebSocket Event Handlers ─────────────────────────────
onEvent('TRADE_ALERT', (data: any) => {
  latestPrediction.value = data;
  signalHistory.value.unshift(mapPredictionToSignal(data));
  if (signalHistory.value.length > 50) signalHistory.value = signalHistory.value.slice(0, 40);

  // v3.5 Sovereign Audio: directional sound
  if (data.win_probability >= 70 && data.verdict !== 'HOLD') {
    playSignal(data.win_probability, data.verdict);
  } else {
    play('success');
  }
  isScanning.value = false;
  isSynced.value = true;
});

onEvent('SIGNAL_UPDATE', (data: any) => {
  latestPrediction.value = data;
  signalHistory.value.unshift(mapPredictionToSignal(data));
  if (signalHistory.value.length > 50) signalHistory.value = signalHistory.value.slice(0, 40);

  // v3.5 Sovereign Audio: directional sound
  if (data.win_probability >= 70 && data.verdict !== 'HOLD') {
    playSignal(data.win_probability, data.verdict);
  }
  isScanning.value = false;
  isSynced.value = true;
});

onEvent('AGENT_UPDATE', (data: any) => {
  if (data.type === 'scraper') {
    scraperData.value = data.data;
    play('pulse');
  }
  if (data.type === 'journalist') {
    journalistData.value = data.data;
  }
});

onEvent('WATCHER_ALERT', (alert: any) => {
  watcherAlerts.value.unshift(alert);
  if (watcherAlerts.value.length > 50) watcherAlerts.value = watcherAlerts.value.slice(0, 40);
  if (alert.type === 'EMERGENCY') play('alarm');
});

// Real-time price pulse from Hub
onEvent('PRICE_FEED', (data: any) => {
  if (data.symbol === selectedSymbol.value) {
    livePriceData.value = { price: data.price, change: data.change_24h };
    // Update chart's last candle in real-time
    chartRef.value?.updateLastCandle(data.price);
  }
});

onEvent('SYSTEM_STATUS', (data: any) => {
  if (data.hub) hubStatus.value = data.hub;
  if (data.brain) brainStatus.value = data.brain;
});

onEvent('ERROR', () => {});
onEvent('HEARTBEAT', () => {});

// Map prediction to signal format for SignalFeed
function mapPredictionToSignal(pred: any): any {
  return {
    id: pred.id || `SIG-${Date.now()}`,
    symbol: pred.symbol,
    status: pred.conviction || pred.status || 'HOLD',
    direction: pred.verdict || pred.direction || 'HOLD',
    probability: pred.win_probability || pred.probability || 0,
    long_prob: pred.long_prob || 50,
    short_prob: pred.short_prob || 50,
    risk_level: pred.risk_level || 'NEUTRAL',
    entry_price: pred.trade_plan?.entry || pred.entry_price || 0,
    take_profit: pred.trade_plan?.take_profit || pred.take_profit || 0,
    stop_loss: pred.trade_plan?.stop_loss || pred.stop_loss || 0,
    leverage: pred.trade_plan?.leverage || pred.leverage || 1,
    margin_percent: pred.trade_plan?.margin_percent || pred.margin_percent || 100,
    risk_reward_ratio: pred.trade_plan?.risk_reward || pred.risk_reward_ratio || 0,
    timeframe: pred.timeframe || selectedInterval.value,
    message: pred.reasoning || pred.message || '',
    timestamp: pred.timestamp || new Date().toISOString(),
    simulation_meta: {
      total_simulations: 100,
      winning_paths: Math.round((pred.win_probability || 0)),
      mode_target: pred.trade_plan?.take_profit || 0,
      floor_price: pred.trade_plan?.stop_loss || 0,
    },
  };
}

// ─── Connection status ────────────────────────────────────
watch(isConnected, (connected) => {
  hubStatus.value = connected ? 'ONLINE' : 'OFFLINE';
  play(connected ? 'connect' : 'disconnect');
});

// ─── Asset Selection (RESET everything) ───────────────────
function onAssetSelect(symbol: string): void {
  if (symbol === selectedSymbol.value) return;

  latestPrediction.value = null;
  scraperData.value = null;
  journalistData.value = null;
  watcherAlerts.value = [];
  livePriceData.value = { price: 0, change: 0 };

  selectedSymbol.value = symbol;
  chartKey.value++;

  // Tell Hub to track this symbol for price pulse
  fetch('/api/pulse/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  }).catch(() => {});
}

// ─── Interval Selection ───────────────────────────────────
function onIntervalSelect(interval: string, binance: string, ms: number): void {
  selectedInterval.value = interval;
  binanceInterval.value = binance;
  intervalMs.value = ms;
  chartKey.value++;
  isSynced.value = false;
  play('pulse');
  startCountdownTimer();
}

// ─── Candle-Close Sync — Auto-trigger committee ───────────
function onCandleClose(): void {
  play('gong');
  isSynced.value = false;
  triggerCommittee();
}

// ─── Committee trigger ────────────────────────────────────
async function triggerCommittee(): Promise<void> {
  if (isSimulating.value) return;
  isSimulating.value = true;
  isScanning.value = true;

  // Play the Gong — analysis started
  play('gong');

  try {
    const res = await fetch('/api/committee/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: selectedSymbol.value,
        timeframe: selectedInterval.value,
        binanceInterval: binanceInterval.value,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Committee run failed:', err);
    }
  } catch (err: any) {
    console.error('Committee request failed:', err.message);
  } finally {
    isSimulating.value = false;
    // Scanning will stop when we receive the prediction via WebSocket
    setTimeout(() => { isScanning.value = false; }, 30000);
  }
}

// ─── Fetch system status ──────────────────────────────────
async function fetchStatus(): Promise<void> {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      hubStatus.value = data.hub;
      brainStatus.value = data.brain;
    }
  } catch { /* retry */ }
}

// ─── Widget toggle handler ────────────────────────────────
function onToggleWidget(widget: string, active: boolean, url?: string): void {
  activeWidgets.value[widget] = active;
  if (widget === 'liveNews' && url) {
    liveNewsUrl.value = url;
  }
}

function closeWidget(widget: string): void {
  activeWidgets.value[widget] = false;
  settingsRef.value?.closeWidget(widget as any);
}

function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/))([\\w-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`;
  return url;
}

// ─── Initialize ───────────────────────────────────────────
onMounted(() => {
  fetchStatus();
  setInterval(fetchStatus, 10000);
  startCountdownTimer();
  // Set initial pulse tracking
  fetch('/api/pulse/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol: selectedSymbol.value }),
  }).catch(() => {});
});
</script>

<template>
  <div class="min-h-screen flex flex-col scan-overlay grid-bg">
    <!-- Header -->
    <SystemHeader
      :hub-status="hubStatus"
      :brain-status="brainStatus"
      :ws-connected="isConnected"
      :is-muted="isMuted"
      @toggle-mute="toggleMute"
    />

    <!-- Asset Selector -->
    <div class="px-4 pt-3">
      <AssetSelector
        :selected-symbol="selectedSymbol"
        @select="onAssetSelect"
      />
    </div>

    <!-- Master Interval Toggle -->
    <div class="px-4 pt-2">
      <IntervalToggle
        :selected="selectedInterval"
        @select="onIntervalSelect"
        @candle-close="onCandleClose"
      />
    </div>

    <!-- Main Layout Grid -->
    <main class="flex-1 p-4 flex flex-col gap-3 overflow-y-auto min-h-0 custom-scrollbar">
      
      <!-- Top Row: Chart & Committee Panel -->
      <div class="grid grid-cols-12 gap-3 h-[500px] shrink-0">
        <!-- Chart -->
        <div class="col-span-9 h-full min-h-0 relative">
          <PriceChart
            ref="chartRef"
            :key="chartKey"
            :symbol="selectedSymbol"
            :binance-interval="binanceInterval"
            :support-levels="supportLevels"
            :resistance-levels="resistanceLevels"
            :is-scanning="isScanning"
          />
        </div>

        <!-- Right Sidebar: Committee Panel & Signal Feed -->
        <div class="col-span-3 glass-panel flex flex-col h-full overflow-hidden" style="padding: 16px 14px 0 14px;">
          <!-- Top Section -->
          <div class="flex flex-col items-center gap-3 shrink-0 relative w-full pt-6">
            <button 
              @click="showHistoryModal = true"
              class="absolute top-0 right-0 text-[10px] text-[var(--color-text-muted)] hover:text-white flex items-center gap-1 transition-colors px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-md cursor-pointer group"
            >
              <span class="opacity-70 group-hover:opacity-100">📜</span> History
            </button>

            <DualProbabilityGauge
              :longProb="latestPrediction?.long_prob ?? 50"
              :shortProb="latestPrediction?.short_prob ?? 50"
              :riskLevel="latestPrediction?.risk_level ?? 'NEUTRAL'"
              :size="110"
            />
            
            <div v-if="livePriceData.price > 0" class="text-center">
              <div class="font-mono text-[15px] font-semibold tabular-nums"
                :class="livePriceData.change >= 0 ? 'text-[var(--color-neon-green)]' : 'text-[var(--color-neon-red)]'">
                ${{ livePriceData.price > 1000 ? livePriceData.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : livePriceData.price.toFixed(4) }}
              </div>
            </div>

            <!-- Status -->
            <div class="text-[10px] text-center font-medium">
              <span v-if="latestPrediction" :class="[
                latestPrediction.verdict === 'LONG' ? 'text-[var(--color-neon-green)]' :
                latestPrediction.verdict === 'SHORT' ? 'text-[var(--color-neon-red)]' :
                'text-[var(--color-text-muted)]'
              ]">
                {{ latestPrediction.verdict }}
              </span>
              <span v-else class="text-[var(--color-text-muted)]">Idle</span>
            </div>

            <!-- Run Committee Button -->
            <button
              @click="triggerCommittee"
              :disabled="isSimulating"
              class="btn-primary w-full"
            >
              {{ isSimulating ? 'Analyzing…' : 'Run Committee' }}
            </button>

            <!-- Committee Countdown Timer -->
            <div class="w-full space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[8px] text-[var(--color-text-muted)] font-medium uppercase tracking-[0.05em]">
                  Next {{ selectedInterval }} audit
                </span>
                <span class="font-mono text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                  {{ committeeCountdown }}
                </span>
              </div>
              <div class="w-full h-[2px] bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-1000"
                  :style="{ width: committeeProgress + '%', background: 'var(--color-neon-cyan)' }"></div>
              </div>
            </div>

            <!-- Sync Status -->
            <div class="flex items-center gap-1.5 self-start mb-2">
              <div :class="['w-1.5 h-1.5 rounded-full', isSynced ? 'bg-[var(--color-neon-green)] status-dot--pulse' : 'bg-[var(--color-text-muted)]']"></div>
              <span class="text-[8px]" :class="isSynced ? 'text-[var(--color-neon-green)]' : 'text-[var(--color-text-muted)]'">
                {{ isSynced ? 'Forensically Synced' : 'Awaiting Sync' }}
              </span>
            </div>
          </div>

          <!-- Bottom Section: Scrollable Signal Feed -->
          <div class="flex-1 w-full min-h-0 border-t border-[var(--color-border)] mt-1 pt-1 overflow-x-hidden overflow-y-auto custom-scrollbar -mx-2 px-2 pb-2">
            <SignalFeed :signals="signalHistory" class="!bg-transparent !p-0 !border-none !rounded-none" />
          </div>
        </div>
      </div>

      <!-- Middle Row: Trade Card -->
      <div class="shrink-0 w-full relative">
        <TradeCard
          v-if="latestPrediction"
          :verdict="mapPredictionToSignal(latestPrediction)"
        />
        <div v-else class="glass-panel text-center py-6 px-4">
          <div class="text-[12px] text-[var(--color-text-secondary)] font-medium">Awaiting Execution Orders</div>
          <div class="text-[10px] text-[var(--color-text-muted)] mt-1 leading-relaxed max-w-lg mx-auto">
            Select an asset and interval, or manually trigger the committee to synthesize technical scraping and intelligence reports into an actionable trading plan.
          </div>
        </div>
      </div>

      <!-- Bottom Row: Forensics -->
      <div class="grid grid-cols-12 gap-3 h-[380px] shrink-0">
        <div class="col-span-6 h-full min-h-0">
          <IntelligenceTerminal
            :journalist="journalistData"
            :alerts="watcherAlerts"
          />
        </div>
        <div class="col-span-6 h-full min-h-0">
          <TechnicalForensics
            :scraper="scraperData"
            :current-price="latestPrediction?.trade_plan?.entry || 0"
          />
        </div>
      </div>
      <SignalHistoryModal 
        v-if="showHistoryModal" 
        :signals="signalHistory" 
        @close="showHistoryModal = false" 
      />
    </main>

    <!-- Floating Widgets -->
    <!-- Live News Video -->
    <FloatingWidget
      v-if="activeWidgets.liveNews && liveNewsUrl"
      title="Live News Stream"
      icon="📺"
      :initial-x="60"
      :initial-y="80"
      width="480px"
      height="320px"
      @close="closeWidget('liveNews')"
    >
      <iframe
        v-if="liveNewsUrl"
        :src="getYouTubeEmbedUrl(liveNewsUrl)"
        class="w-full rounded"
        style="height: 260px; border: none;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
      <div v-else class="text-[10px] text-[var(--color-text-muted)] text-center py-8">
        Paste a video URL in Settings to start streaming
      </div>
    </FloatingWidget>

    <!-- Latest News Feed -->
    <FloatingWidget
      v-if="activeWidgets.latestNews"
      title="Latest News"
      icon="📰"
      :initial-x="200"
      :initial-y="120"
      width="380px"
      height="400px"
      @close="closeWidget('latestNews')"
    >
      <div v-if="journalistData" class="space-y-2">
        <div class="text-[10px] font-bold text-[var(--color-text-secondary)] tracking-wider mb-2">
          {{ journalistData.sentiment }} • Score: {{ journalistData.sentiment_score }}/100
        </div>
        <div v-for="(item, i) in journalistData.findings" :key="i"
          class="p-2 rounded text-[10px] leading-relaxed"
          style="background: rgba(0,0,0,0.3); border: 1px solid rgba(0,240,255,0.06);">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span :class="[
              'w-1.5 h-1.5 rounded-full shrink-0',
              item.sentiment === 'positive' ? 'bg-[var(--color-neon-green)]' :
              item.sentiment === 'negative' ? 'bg-[var(--color-neon-red)]' : 'bg-[var(--color-neon-amber)]'
            ]"></span>
            <span class="text-[var(--color-text-primary)] font-medium">{{ item.headline }}</span>
          </div>
          <div class="text-[var(--color-text-muted)] pl-3">
            Impact: <span class="text-[var(--color-neon-cyan)]">{{ item.impact }}</span>
          </div>
        </div>
        <div class="text-[9px] text-[var(--color-text-muted)] italic mt-2 p-2 rounded" style="background: rgba(0,240,255,0.03);">
          “{{ journalistData.narrative }}”
        </div>
      </div>
      <div v-else class="text-[10px] text-[var(--color-text-muted)] text-center py-8">
        Run Committee to generate news analysis
      </div>
    </FloatingWidget>

    <!-- Trade Log -->
    <FloatingWidget
      v-if="activeWidgets.tradeLog"
      title="Trade Log"
      icon="📋"
      :initial-x="350"
      :initial-y="150"
      width="420px"
      height="360px"
      @close="closeWidget('tradeLog')"
    >
      <div v-if="signalHistory.length" class="space-y-1.5">
        <div v-for="sig in signalHistory.slice(0, 20)" :key="sig.id"
          class="flex items-center justify-between p-1.5 rounded text-[10px]"
          style="background: rgba(0,0,0,0.3); border: 1px solid rgba(0,240,255,0.04);">
          <div class="flex items-center gap-2">
            <span :class="[
              'font-bold',
              sig.direction === 'LONG' ? 'text-[var(--color-neon-green)]' :
              sig.direction === 'SHORT' ? 'text-[var(--color-neon-red)]' : 'text-[var(--color-text-muted)]'
            ]">{{ sig.direction }}</span>
            <span class="text-[var(--color-text-secondary)]">{{ sig.symbol }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="tabular-nums">${{ sig.entry_price?.toLocaleString() }}</span>
            <span class="font-bold" :class="sig.probability >= 70 ? 'text-[var(--color-neon-green)]' : 'text-[var(--color-text-muted)]'">{{ sig.probability }}%</span>
            <span class="text-[var(--color-text-muted)]">{{ new Date(sig.timestamp).toLocaleTimeString() }}</span>
          </div>
        </div>
      </div>
      <div v-else class="text-[10px] text-[var(--color-text-muted)] text-center py-8">
        No signals yet
      </div>
    </FloatingWidget>

    <!-- Probability History -->
    <FloatingWidget
      v-if="activeWidgets.miniChart"
      title="Probability History"
      icon="📊"
      :initial-x="500"
      :initial-y="180"
      width="360px"
      height="260px"
      @close="closeWidget('miniChart')"
    >
      <div v-if="signalHistory.length" class="space-y-1">
        <div v-for="(sig, i) in signalHistory.slice(0, 15)" :key="i"
          class="flex items-center gap-2 text-[10px]">
          <span class="text-[var(--color-text-muted)] w-14 shrink-0 tabular-nums">{{ new Date(sig.timestamp).toLocaleTimeString() }}</span>
          <div class="flex-1 h-3 rounded-full overflow-hidden" style="background: rgba(0,0,0,0.4);">
            <div class="h-full rounded-full transition-all"
              :style="{ width: sig.probability + '%' }"
              :class="sig.probability >= 70 ? 'bg-[var(--color-neon-green)]' : sig.probability >= 50 ? 'bg-[var(--color-neon-amber)]' : 'bg-[var(--color-neon-red)]'">
            </div>
          </div>
          <span class="w-10 text-right tabular-nums font-bold"
            :class="sig.probability >= 70 ? 'text-[var(--color-neon-green)]' : 'text-[var(--color-text-muted)]'">{{ sig.probability }}%</span>
        </div>
      </div>
      <div v-else class="text-[10px] text-[var(--color-text-muted)] text-center py-8">
        Run Committee to generate probability data
      </div>
    </FloatingWidget>

    <!-- Settings Panel (gear icon bottom-right) -->
    <SettingsPanel
      ref="settingsRef"
      @toggle-widget="onToggleWidget"
    />

    <!-- Footer -->
    <footer class="px-6 py-2 flex items-center justify-between text-[9px] text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
      <div class="flex items-center gap-3">
        <span class="text-[var(--color-text-secondary)] font-semibold">KAIROS v3.5</span>
        <span class="opacity-30">·</span>
        <span>{{ selectedSymbol }}</span>
        <span class="opacity-30">·</span>
        <span>{{ selectedInterval }}</span>
        <span class="opacity-30">·</span>
        <span>{{ signalHistory.length }} signals</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="isConnected ? 'text-[var(--color-execute)]' : 'text-[var(--color-neon-red)]'">
          {{ isConnected ? '● Connected' : '○ Offline' }}
        </span>
      </div>
    </footer>
  </div>
</template>
