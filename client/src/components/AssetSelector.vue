<script setup lang="ts">
// ============================================================
// KAIROS PRO — Asset Selector
// Top bar with 5 crypto + 5 forex selectable assets
// Displays real-time prices from Binance/Forex APIs
// ============================================================

import { ref, onMounted, onUnmounted } from 'vue';

interface Asset {
  symbol: string;
  name: string;
  type: 'crypto' | 'forex';
  baseCurrency: string;
  quoteCurrency: string;
  icon: string;
}

interface TickerData {
  symbol: string;
  price: number;
  changePercent24h: number;
}

const props = defineProps<{
  selectedSymbol: string;
}>();

const emit = defineEmits<{
  select: [symbol: string];
}>();

const assets = ref<Asset[]>([]);
const tickers = ref<Map<string, TickerData>>(new Map());
const isLoading = ref(true);
let tickerInterval: ReturnType<typeof setInterval>;

// Fetch asset list from Hub
async function fetchAssets(): Promise<void> {
  try {
    const res = await fetch('/api/assets');
    if (res.ok) {
      const data = await res.json();
      assets.value = data.all;
    }
  } catch (err) {
    console.error('Failed to fetch assets:', err);
    // Fallback assets
    assets.value = [
      { symbol: 'BTCUSDT', name: 'Bitcoin', type: 'crypto', baseCurrency: 'BTC', quoteCurrency: 'USDT', icon: '₿' },
      { symbol: 'ETHUSDT', name: 'Ethereum', type: 'crypto', baseCurrency: 'ETH', quoteCurrency: 'USDT', icon: 'Ξ' },
      { symbol: 'SOLUSDT', name: 'Solana', type: 'crypto', baseCurrency: 'SOL', quoteCurrency: 'USDT', icon: '◎' },
      { symbol: 'XRPUSDT', name: 'XRP', type: 'crypto', baseCurrency: 'XRP', quoteCurrency: 'USDT', icon: '✕' },
      { symbol: 'BNBUSDT', name: 'BNB', type: 'crypto', baseCurrency: 'BNB', quoteCurrency: 'USDT', icon: '◆' },
      { symbol: 'DOGEUSDT', name: 'Dogecoin', type: 'crypto', baseCurrency: 'DOGE', quoteCurrency: 'USDT', icon: '🐕' },
      { symbol: 'PIPPINUSDT', name: 'Pippin', type: 'crypto', baseCurrency: 'PIPPIN', quoteCurrency: 'USDT', icon: '🍏' },
      { symbol: 'FARTCOINUSDT', name: 'Fartcoin', type: 'crypto', baseCurrency: 'FARTCOIN', quoteCurrency: 'USDT', icon: '💨' },
      { symbol: 'EURUSD', name: 'EUR/USD', type: 'forex', baseCurrency: 'EUR', quoteCurrency: 'USD', icon: '€' },
      { symbol: 'GBPUSD', name: 'GBP/USD', type: 'forex', baseCurrency: 'GBP', quoteCurrency: 'USD', icon: '£' },
      { symbol: 'USDJPY', name: 'USD/JPY', type: 'forex', baseCurrency: 'USD', quoteCurrency: 'JPY', icon: '¥' },
      { symbol: 'AUDUSD', name: 'AUD/USD', type: 'forex', baseCurrency: 'AUD', quoteCurrency: 'USD', icon: 'A$' },
      { symbol: 'USDCHF', name: 'USD/CHF', type: 'forex', baseCurrency: 'USD', quoteCurrency: 'CHF', icon: '₣' },
    ];
  }
}

// Fetch all tickers
async function fetchTickers(): Promise<void> {
  try {
    const res = await fetch('/api/market/tickers');
    if (res.ok) {
      const data = await res.json();
      const map = new Map<string, TickerData>();
      for (const t of data.all) {
        map.set(t.symbol, t);
      }
      tickers.value = map;
    }
  } catch (err) {
    // Silent fail — will retry
  } finally {
    isLoading.value = false;
  }
}

function formatPrice(symbol: string, price: number): string {
  if (!price) return '---';
  
  // JPY pairs use 2 decimals, crypto varies
  if (symbol.includes('JPY')) return price.toFixed(2);
  if (price > 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price > 1) return price.toFixed(4);
  return price.toFixed(5);
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

onMounted(async () => {
  await fetchAssets();
  await fetchTickers();
  // Refresh tickers every 15s
  tickerInterval = setInterval(fetchTickers, 15000);
});

onUnmounted(() => {
  if (tickerInterval) clearInterval(tickerInterval);
});
</script>

<template>
  <div class="glass-panel p-3">
    <!-- Section Labels -->
    <div class="flex items-center gap-2 mb-2 px-1">
      <span class="text-[9px] tracking-[0.3em] text-[var(--color-neon-cyan)] font-bold">
        SELECT ASSET
      </span>
      <div class="flex-1 h-px bg-[rgba(0,240,255,0.08)]"></div>
    </div>

    <!-- Asset Tabs -->
    <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <!-- Crypto Section -->
      <div class="flex items-center gap-1 mr-1">
        <span class="text-[8px] tracking-wider text-[var(--color-text-muted)] uppercase shrink-0 px-1">
          CRYPTO
        </span>
      </div>

      <template v-for="asset in assets" :key="asset.symbol">
        <!-- Divider between crypto and forex -->
        <div
          v-if="asset.symbol === 'EURUSD'"
          class="flex items-center gap-1 mx-1"
        >
          <div class="w-px h-8 bg-[rgba(0,240,255,0.15)]"></div>
          <span class="text-[8px] tracking-wider text-[var(--color-text-muted)] uppercase shrink-0 px-1">
            FOREX
          </span>
        </div>

        <button
          @click="emit('select', asset.symbol)"
          :class="[
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 shrink-0 cursor-pointer border',
            props.selectedSymbol === asset.symbol
              ? 'bg-[rgba(0,240,255,0.1)] border-[rgba(0,240,255,0.3)] shadow-[0_0_12px_rgba(0,240,255,0.1)]'
              : 'bg-[rgba(0,0,0,0.2)] border-transparent hover:bg-[rgba(0,240,255,0.05)] hover:border-[rgba(0,240,255,0.1)]'
          ]"
        >
          <!-- Icon -->
          <span class="text-base" :class="props.selectedSymbol === asset.symbol ? 'neon-text-cyan' : 'text-[var(--color-text-secondary)]'">
            {{ asset.icon }}
          </span>

          <!-- Info -->
          <div class="flex flex-col items-start">
            <span :class="[
              'text-[11px] font-bold leading-none',
              props.selectedSymbol === asset.symbol ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
            ]">
              {{ asset.baseCurrency }}<span class="text-[var(--color-text-muted)]">/{{ asset.quoteCurrency }}</span>
            </span>

            <!-- Price + Change -->
            <div class="flex items-center gap-1.5 mt-0.5" v-if="tickers.get(asset.symbol)">
              <span class="text-[10px] tabular-nums text-[var(--color-text-secondary)]">
                {{ formatPrice(asset.symbol, tickers.get(asset.symbol)!.price) }}
              </span>
              <span
                :class="[
                  'text-[9px] tabular-nums font-medium',
                  tickers.get(asset.symbol)!.changePercent24h >= 0
                    ? 'text-[var(--color-neon-green)]'
                    : 'text-[var(--color-neon-red)]'
                ]"
              >
                {{ formatChange(tickers.get(asset.symbol)!.changePercent24h) }}
              </span>
            </div>
            <div v-else class="mt-0.5">
              <span class="text-[10px] text-[var(--color-text-muted)]">
                {{ isLoading ? '...' : '---' }}
              </span>
            </div>
          </div>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
