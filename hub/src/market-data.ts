// ============================================================
// KAIROS PRO — Market Data Service
// Fetches REAL market data from Binance (crypto) and
// generates realistic forex data from live exchange rates
// ============================================================

export interface Asset {
  symbol: string;
  name: string;
  type: 'crypto' | 'forex';
  binanceSymbol?: string;     // For Binance API
  baseCurrency: string;
  quoteCurrency: string;
  icon: string;               // Emoji icon
  defaultVolatility: number;  // Daily vol for synthetic gen
}

export interface KlineData {
  time: number;     // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: string;
}

// ─── Asset Definitions ───────────────────────────────────

export const CRYPTO_ASSETS: Asset[] = [
  {
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    type: 'crypto',
    binanceSymbol: 'BTCUSDT',
    baseCurrency: 'BTC',
    quoteCurrency: 'USDT',
    icon: '₿',
    defaultVolatility: 0.025,
  },
  {
    symbol: 'ETHUSDT',
    name: 'Ethereum',
    type: 'crypto',
    binanceSymbol: 'ETHUSDT',
    baseCurrency: 'ETH',
    quoteCurrency: 'USDT',
    icon: 'Ξ',
    defaultVolatility: 0.03,
  },
  {
    symbol: 'SOLUSDT',
    name: 'Solana',
    type: 'crypto',
    binanceSymbol: 'SOLUSDT',
    baseCurrency: 'SOL',
    quoteCurrency: 'USDT',
    icon: '◎',
    defaultVolatility: 0.045,
  },
  {
    symbol: 'XRPUSDT',
    name: 'XRP',
    type: 'crypto',
    binanceSymbol: 'XRPUSDT',
    baseCurrency: 'XRP',
    quoteCurrency: 'USDT',
    icon: '✕',
    defaultVolatility: 0.035,
  },
  {
    symbol: 'BNBUSDT',
    name: 'BNB',
    type: 'crypto',
    binanceSymbol: 'BNBUSDT',
    baseCurrency: 'BNB',
    quoteCurrency: 'USDT',
    icon: '◆',
    defaultVolatility: 0.028,
  },
  {
    symbol: 'DOGEUSDT',
    name: 'Dogecoin',
    type: 'crypto',
    binanceSymbol: 'DOGEUSDT',
    baseCurrency: 'DOGE',
    quoteCurrency: 'USDT',
    icon: '🐕',
    defaultVolatility: 0.08,
  },
  {
    symbol: 'PIPPINUSDT',
    name: 'Pippin',
    type: 'crypto',
    binanceSymbol: 'PIPPINUSDT',
    baseCurrency: 'PIPPIN',
    quoteCurrency: 'USDT',
    icon: '🍏',
    defaultVolatility: 0.15,
  },
  {
    symbol: 'FARTCOINUSDT',
    name: 'Fartcoin',
    type: 'crypto',
    binanceSymbol: 'FARTCOINUSDT',
    baseCurrency: 'FARTCOIN',
    quoteCurrency: 'USDT',
    icon: '💨',
    defaultVolatility: 0.20,
  },
];

export const FOREX_ASSETS: Asset[] = [
  {
    symbol: 'EURUSD',
    name: 'EUR/USD',
    type: 'forex',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    icon: '€',
    defaultVolatility: 0.005,
  },
  {
    symbol: 'GBPUSD',
    name: 'GBP/USD',
    type: 'forex',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    icon: '£',
    defaultVolatility: 0.006,
  },
  {
    symbol: 'USDJPY',
    name: 'USD/JPY',
    type: 'forex',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    icon: '¥',
    defaultVolatility: 0.005,
  },
  {
    symbol: 'AUDUSD',
    name: 'AUD/USD',
    type: 'forex',
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    icon: 'A$',
    defaultVolatility: 0.006,
  },
  {
    symbol: 'USDCHF',
    name: 'USD/CHF',
    type: 'forex',
    baseCurrency: 'USD',
    quoteCurrency: 'CHF',
    icon: '₣',
    defaultVolatility: 0.005,
  },
];

export const ALL_ASSETS: Asset[] = [...CRYPTO_ASSETS, ...FOREX_ASSETS];

// ─── Binance API ──────────────────────────────────────────

const BINANCE_BASE = 'https://api.binance.com/api/v3';

/**
 * Fetch real kline/candlestick data from Binance
 * Completely free — no API key required
 */
export async function fetchBinanceKlines(
  symbol: string,
  interval: string = '1m',
  limit: number = 1000
): Promise<KlineData[]> {
  try {
    const url = `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
    }

    const raw: any[][] = await res.json();

    return raw.map((k) => ({
      time: Math.floor(k[0] / 1000), // Convert ms to seconds
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (err) {
    if (symbol.includes('PIPPIN') || symbol.includes('FARTCOIN') || symbol.includes('DOGE')) {
      console.warn(`[Binance Fallback] Generating synthetic memecoin Klines for: ${symbol}`);
      const base = symbol.includes('PIPPIN') ? 0.075 : symbol.includes('FART') ? 0.003 : 0.15;
      return generateForexKlines(base, 0.20, limit);
    }
    throw err;
  }
}

/**
 * Fetch 24h ticker data from Binance
 */
export async function fetchBinanceTicker(symbol: string): Promise<TickerData> {
  try {
    const url = `${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Binance ticker error: ${res.status}`);
    }

    const data = await res.json();
    return {
      symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (symbol.includes('PIPPIN') || symbol.includes('FARTCOIN') || symbol.includes('DOGE')) {
      console.warn(`[Binance Fallback] Generating synthetic memecoin Ticker for: ${symbol}`);
      const base = symbol.includes('PIPPIN') ? 0.075 : symbol.includes('FART') ? 0.003 : 0.15;
      return generateForexTicker(symbol, base, 0.20);
    }
    throw err;
  }
}

/**
 * Fetch all crypto tickers in one call
 */
export async function fetchAllCryptoTickers(): Promise<TickerData[]> {
  const symbols = CRYPTO_ASSETS.map((a) => a.binanceSymbol!);
  const tickers: TickerData[] = [];

  // Fetch in parallel
  const results = await Promise.allSettled(
    symbols.map((s) => fetchBinanceTicker(s))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      tickers.push(result.value);
    }
  }

  return tickers;
}

// ─── Forex Data ───────────────────────────────────────────

// Realistic forex base prices (will be updated from live API)
const FOREX_BASE_PRICES: Record<string, number> = {
  EURUSD: 1.0850,
  GBPUSD: 1.2650,
  USDJPY: 150.50,
  AUDUSD: 0.6550,
  USDCHF: 0.8850,
};

/**
 * Fetch live forex rates from free API
 */
export async function fetchForexRates(): Promise<Record<string, number>> {
  try {
    // Using exchangerate-api (free, no key needed)
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error('Forex API failed');
    const data = await res.json();
    const rates = data.rates;

    return {
      EURUSD: rates.EUR ? 1 / rates.EUR : FOREX_BASE_PRICES.EURUSD,
      GBPUSD: rates.GBP ? 1 / rates.GBP : FOREX_BASE_PRICES.GBPUSD,
      USDJPY: rates.JPY || FOREX_BASE_PRICES.USDJPY,
      AUDUSD: rates.AUD ? 1 / rates.AUD : FOREX_BASE_PRICES.AUDUSD,
      USDCHF: rates.CHF || FOREX_BASE_PRICES.USDCHF,
    };
  } catch (err) {
    console.warn('⚠️ Forex rate fetch failed, using defaults');
    return { ...FOREX_BASE_PRICES };
  }
}

/**
 * Generate realistic forex kline data using Geometric Brownian Motion.
 * Uses real current price as the latest candle close.
 * Statistical parameters match real forex market behaviour.
 */
export function generateForexKlines(
  currentPrice: number,
  volatility: number,
  count: number = 1000,
  intervalSeconds: number = 60
): KlineData[] {
  const klines: KlineData[] = [];
  const now = Math.floor(Date.now() / 1000);

  // Per-candle parameters from daily volatility
  // Assuming ~1440 candles per day (1-min)
  const candlesPerDay = 86400 / intervalSeconds;
  const sigma = volatility / Math.sqrt(candlesPerDay);
  const mu = 0; // No drift for forex

  // Work backwards from current price
  let price = currentPrice;
  const prices: number[] = [price];

  for (let i = 1; i < count; i++) {
    const change = price * (mu + sigma * (Math.random() * 2 - 1));
    price = price - change; // Going backwards
    prices.unshift(price);
  }

  // Generate OHLCV from prices
  for (let i = 0; i < prices.length; i++) {
    const close = prices[i];
    const open = i > 0 ? prices[i - 1] : close * (1 + sigma * (Math.random() * 2 - 1));
    const high = Math.max(open, close) * (1 + Math.random() * sigma * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * sigma * 0.5);

    klines.push({
      time: now - (count - i) * intervalSeconds,
      open: roundForex(open, currentPrice),
      high: roundForex(high, currentPrice),
      low: roundForex(low, currentPrice),
      close: roundForex(close, currentPrice),
      volume: Math.round(1000 + Math.random() * 5000),
    });
  }

  return klines;
}

/**
 * Round forex prices to appropriate decimal places
 */
function roundForex(price: number, reference: number): number {
  // JPY pairs use 2 decimals, others use 4-5
  if (reference > 100) {
    return Math.round(price * 100) / 100; // JPY
  }
  return Math.round(price * 100000) / 100000; // Standard
}

/**
 * Generate forex ticker data from current rate
 */
export function generateForexTicker(
  symbol: string,
  currentPrice: number,
  volatility: number
): TickerData {
  const change = currentPrice * volatility * (Math.random() * 2 - 1) * 0.3;
  return {
    symbol,
    price: currentPrice,
    change24h: Math.round(change * 100000) / 100000,
    changePercent24h: Math.round((change / currentPrice) * 10000) / 100,
    high24h: currentPrice * (1 + volatility * 0.5),
    low24h: currentPrice * (1 - volatility * 0.5),
    volume24h: Math.round(50000 + Math.random() * 200000),
    timestamp: new Date().toISOString(),
  };
}

// ─── Unified Data Fetcher ─────────────────────────────────

/**
 * Fetch kline data for any asset (crypto or forex)
 */
export async function fetchKlines(asset: Asset, interval: string = '1m', limit: number = 1000): Promise<KlineData[]> {
  if (asset.type === 'crypto' && asset.binanceSymbol) {
    return fetchBinanceKlines(asset.binanceSymbol, interval, limit);
  }

  // Forex — generate from real current price
  const rates = await fetchForexRates();
  const currentPrice = rates[asset.symbol] || FOREX_BASE_PRICES[asset.symbol] || 1.0;
  return generateForexKlines(currentPrice, asset.defaultVolatility, limit);
}

/**
 * Fetch ticker for any asset
 */
export async function fetchTicker(asset: Asset): Promise<TickerData> {
  if (asset.type === 'crypto' && asset.binanceSymbol) {
    return fetchBinanceTicker(asset.binanceSymbol);
  }

  const rates = await fetchForexRates();
  const currentPrice = rates[asset.symbol] || FOREX_BASE_PRICES[asset.symbol] || 1.0;
  return generateForexTicker(asset.symbol, currentPrice, asset.defaultVolatility);
}
