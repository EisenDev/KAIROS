// ============================================================
// KAIROS PRO v3.5 — The Hub (Execution Layer)
// Node.js + Hono + TypeScript Gateway Server
// Candle-Close Sync + Real-time Price Pulse + 70% Bi-Directional
// ============================================================

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { streamSSE } from 'hono/streaming';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { wsManager } from './ws-manager.js';
import { checkBrainHealth } from './brain-client.js';
import { keyManager } from './api-key-manager.js';
import {
  ALL_ASSETS, CRYPTO_ASSETS, FOREX_ASSETS,
  fetchKlines, fetchTicker, fetchAllCryptoTickers,
  fetchForexRates, generateForexTicker,
} from './market-data.js';
import {
  runCommittee, startWatcher, getLatestPrediction,
  getLatestScraper, getLatestJournalist, getWatcherAlerts,
  getPredictionHistory, isCommitteeRunning,
} from './committee.js';
import type { SystemStatus } from './types.js';

// ─── Configuration ────────────────────────────────────────
const PORT = parseInt(process.env.HUB_PORT || '8300');
const SIMULATION_INTERVAL = parseInt(process.env.SIMULATION_INTERVAL || '900000');
const WATCHER_INTERVAL = parseInt(process.env.WATCHER_INTERVAL || '30000');
const PRICE_PULSE_INTERVAL = 2000; // 2-second real-time price stream
const startTime = Date.now();

// ─── App Setup ────────────────────────────────────────────
const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// ─── Middleware ───────────────────────────────────────────
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));
app.use('*', logger());

// ─── ASCII Banner ─────────────────────────────────────────
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ██╗  ██╗ █████╗ ██╗██████╗  ██████╗ ███████╗          ║
║   ██║ ██╔╝██╔══██╗██║██╔══██╗██╔═══██╗██╔════╝          ║
║   █████╔╝ ███████║██║██████╔╝██║   ██║███████╗           ║
║   ██╔═██╗ ██╔══██║██║██╔══██╗██║   ██║╚════██║           ║
║   ██║  ██╗██║  ██║██║██║  ██║╚██████╔╝███████║           ║
║   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝       ║
║                                                          ║
║      ⚡ v3.5 — THE EXECUTION LAYER ⚡                     ║
║      🔍 Scraper · 📰 Journalist · 👁️ Watcher · 🎯 Predict ║
║      📈 Real-time Pulse · 70% Bi-Directional           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;

// ─── REST Routes ──────────────────────────────────────────

app.get('/health', async (c) => {
  const brainAlive = await checkBrainHealth();
  return c.json({
    service: 'kairos-hub',
    version: '3.5.0',
    status: 'operational',
    brain: brainAlive ? 'connected' : 'disconnected',
    connections: wsManager.getConnectionCount(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    keys: keyManager.getStats(),
  });
});

app.get('/api/status', async (c) => {
  const brainAlive = await checkBrainHealth();
  return c.json({
    hub: 'ONLINE',
    brain: brainAlive ? 'ONLINE' : 'OFFLINE',
    pulse: 'ONLINE',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    active_connections: wsManager.getConnectionCount(),
    last_simulation: getLatestPrediction()?.timestamp || null,
    committee_running: isCommitteeRunning(),
    keys: keyManager.getStats(),
  } as SystemStatus & Record<string, any>);
});

// ─── Asset Routes ─────────────────────────────────────────

app.get('/api/assets', (c) => c.json({ crypto: CRYPTO_ASSETS, forex: FOREX_ASSETS, all: ALL_ASSETS }));

app.get('/api/market/klines', async (c) => {
  const symbol = c.req.query('symbol') || 'BTCUSDT';
  const interval = c.req.query('interval') || '1m';
  const limit = parseInt(c.req.query('limit') || '500');
  const asset = ALL_ASSETS.find(a => a.symbol === symbol || a.binanceSymbol === symbol);
  if (!asset) return c.json({ error: `Unknown asset: ${symbol}` }, 404);

  try {
    const klines = await fetchKlines(asset, interval, limit);
    return c.json({ symbol, type: asset.type, interval, count: klines.length, klines });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/market/ticker', async (c) => {
  const symbol = c.req.query('symbol') || 'BTCUSDT';
  const asset = ALL_ASSETS.find(a => a.symbol === symbol);
  if (!asset) return c.json({ error: `Unknown asset: ${symbol}` }, 404);
  try {
    return c.json(await fetchTicker(asset));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/market/tickers', async (c) => {
  try {
    const cryptoTickers = await fetchAllCryptoTickers();
    const forexRates = await fetchForexRates();
    const forexTickers = FOREX_ASSETS.map(a => generateForexTicker(a.symbol, forexRates[a.symbol] || 1, a.defaultVolatility));
    return c.json({ crypto: cryptoTickers, forex: forexTickers, all: [...cryptoTickers, ...forexTickers] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── Committee Routes ─────────────────────────────────────

/** Trigger full committee analysis */
app.post('/api/committee/run', async (c) => {
  if (isCommitteeRunning()) {
    return c.json({ message: 'Committee already running' }, 429);
  }
  try {
    const body = await c.req.json<{ symbol?: string; timeframe?: string; binanceInterval?: string }>();
    const symbol = body.symbol || 'BTCUSDT';
    const timeframe = body.timeframe || '15m';
    const binanceInterval = body.binanceInterval || '15m';
    const result = await runCommittee(symbol, timeframe, binanceInterval);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/** Get latest prediction */
app.get('/api/committee/prediction', (c) => {
  const pred = getLatestPrediction();
  if (!pred) return c.json({ message: 'No committee analysis run yet' }, 404);
  return c.json(pred);
});

/** Get latest scraper results */
app.get('/api/committee/scraper', (c) => {
  const data = getLatestScraper();
  if (!data) return c.json({ message: 'No scraper data yet' }, 404);
  return c.json(data);
});

/** Get latest journalist results */
app.get('/api/committee/journalist', (c) => {
  const data = getLatestJournalist();
  if (!data) return c.json({ message: 'No journalist data yet' }, 404);
  return c.json(data);
});

/** Get watcher alerts */
app.get('/api/committee/alerts', (c) => {
  return c.json(getWatcherAlerts());
});

/** Prediction history */
app.get('/api/committee/history', (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  return c.json(getPredictionHistory().slice(-limit));
});

/** Legacy simulate endpoint (redirects to committee) */
app.post('/api/simulate', async (c) => {
  if (isCommitteeRunning()) return c.json({ message: 'Committee already running' }, 429);
  try {
    const body = await c.req.json<{ symbol?: string; timeframe?: string }>();
    const result = await runCommittee(body.symbol || 'BTCUSDT', body.timeframe || '15m');
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── Watcher SSE Stream ───────────────────────────────────

app.get('/api/watcher/stream', (c) => {
  return streamSSE(c, async (stream) => {
    console.log('👁️ [SSE] Watcher stream connected');

    // Send existing alerts
    for (const alert of getWatcherAlerts().slice(-10)) {
      await stream.writeSSE({ data: JSON.stringify(alert), event: 'alert' });
    }

    // Keep connection alive with heartbeat
    let running = true;
    const abortHandler = () => { running = false; };
    c.req.raw.signal.addEventListener('abort', abortHandler);

    while (running) {
      await stream.writeSSE({
        data: JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }),
        event: 'heartbeat',
      });
      await stream.sleep(10000);
    }

    console.log('👁️ [SSE] Watcher stream disconnected');
  });
});

// ─── WebSocket Route ──────────────────────────────────────

app.get('/ws', upgradeWebSocket(() => {
  let clientId: string;
  return {
    onOpen(evt, ws) {
      clientId = wsManager.addClient(ws);
      const pred = getLatestPrediction();
      if (pred) wsManager.sendTo(clientId, 'SIGNAL_UPDATE', pred);
      const scraper = getLatestScraper();
      if (scraper) wsManager.sendTo(clientId, 'AGENT_UPDATE', { type: 'scraper', data: scraper });
      const journalist = getLatestJournalist();
      if (journalist) wsManager.sendTo(clientId, 'AGENT_UPDATE', { type: 'journalist', data: journalist });
    },
    onMessage(evt) {
      try {
        const msg = JSON.parse(typeof evt.data === 'string' ? evt.data : evt.data.toString());
        if (msg.type === 'PING') wsManager.sendTo(clientId, 'HEARTBEAT', { pong: true });
        if (msg.type === 'RUN_COMMITTEE') {
          runCommittee(msg.symbol || 'BTCUSDT', msg.timeframe || '15m').catch(() => {});
        }
      } catch { /* ignore */ }
    },
    onClose() { if (clientId) wsManager.removeClient(clientId); },
    onError() { if (clientId) wsManager.removeClient(clientId); },
  };
}));

// ─── Periodic Committee Loop ──────────────────────────────

function startCommitteeLoop(): void {
  console.log(`⏰ [LOOP] Committee cycle: every ${SIMULATION_INTERVAL / 1000}s`);

  setTimeout(() => {
    runCommittee('BTCUSDT', '15m').catch(err => {
      console.error('Initial committee run failed:', err.message);
    });
  }, 5000);

  setInterval(() => {
    runCommittee('BTCUSDT', '15m', '15m').catch(err => {
      console.error('Periodic committee run failed:', err.message);
    });
  }, SIMULATION_INTERVAL);
}

// ─── Real-time Price Pulse (2-second stream) ───────────

let lastPulseSymbol = 'BTCUSDT';
function startPricePulse(): void {
  console.log(`💫 [PULSE] Real-time price stream every ${PRICE_PULSE_INTERVAL / 1000}s`);
  setInterval(async () => {
    if (wsManager.getConnectionCount() === 0) return;
    try {
      const asset = ALL_ASSETS.find(a => a.symbol === lastPulseSymbol);
      if (!asset) return;
      const ticker = await fetchTicker(asset);
      wsManager.broadcast('PRICE_FEED', {
        symbol: lastPulseSymbol,
        price: ticker.price,
        change_24h: ticker.change24h,
        volume_24h: ticker.volume24h,
        timestamp: new Date().toISOString(),
      });
    } catch { /* silent — price pulse is best-effort */ }
  }, PRICE_PULSE_INTERVAL);
}

// Endpoint to update which symbol the price pulse tracks
app.post('/api/pulse/track', async (c) => {
  const body = await c.req.json<{ symbol?: string }>();
  if (body.symbol) lastPulseSymbol = body.symbol;
  return c.json({ tracking: lastPulseSymbol });
});

// ─── Start Server ─────────────────────────────────────────

console.log(BANNER);
console.log(`📊 Assets: ${CRYPTO_ASSETS.length} crypto + ${FOREX_ASSETS.length} forex`);
console.log(`⏱️  Committee Cycle: ${SIMULATION_INTERVAL / 1000}s`);
console.log(`👁️ Watcher Interval: ${WATCHER_INTERVAL / 1000}s`);
console.log(`🚀 Starting Hub on port ${PORT}...\n`);

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`⚡ KAIROS Hub v3.5 LIVE on http://localhost:${info.port}`);
  console.log(`🔗 WebSocket: ws://localhost:${info.port}/ws`);
  console.log(`📡 API: http://localhost:${info.port}/api/status`);
  console.log(`👁️ SSE: http://localhost:${info.port}/api/watcher/stream`);
  console.log(`💫 Price Pulse: ${PRICE_PULSE_INTERVAL / 1000}s interval\n`);

  wsManager.startHeartbeat(15000);
  startWatcher(WATCHER_INTERVAL);
  startPricePulse();
  startCommitteeLoop();
});

injectWebSocket(server);
