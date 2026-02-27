// ============================================================
// KAIROS PRO v3.5 — Committee Orchestrator (Execution Layer)
// Candle-Close Sync pipeline with interval-aware data fetching
// Scraper + Journalist (parallel) → Brain MC → Prediction
// ============================================================

import { runScraper, type ScraperResult } from './agents/scraper.js';
import { runJournalist, type JournalistResult } from './agents/journalist.js';
import { runWatcherCheck, getEmergencyAlerts, type WatcherAlert } from './agents/watcher.js';
import { runPrediction, type CommitteePrediction } from './agents/prediction.js';
import { requestSimulation, checkBrainHealth } from './brain-client.js';
import { fetchKlines, fetchTicker, type Asset, ALL_ASSETS } from './market-data.js';
import { wsManager } from './ws-manager.js';
import { sql } from './supabase.js';

// ─── State ────────────────────────────────────────────────
let latestPrediction: CommitteePrediction | null = null;
let latestScraper: ScraperResult | null = null;
let latestJournalist: JournalistResult | null = null;
let watcherAlerts: WatcherAlert[] = [];
let isRunning = false;
let lastRunSymbol: string | null = null;

// Journalist hourly cache — news doesn't change every 15 min
let journalistCache: { result: JournalistResult; symbol: string; timestamp: number } | null = null;
const JOURNALIST_CACHE_TTL = 3600_000; // 1 hour

function isJournalistCacheValid(symbol: string): boolean {
  if (!journalistCache) return false;
  if (journalistCache.symbol !== symbol) return false;
  if (Date.now() - journalistCache.timestamp > JOURNALIST_CACHE_TTL) return false;
  return true;
}

const predictionHistory: CommitteePrediction[] = [];

// ─── Main Committee Pipeline ──────────────────────────────

/**
 * Run the full committee analysis pipeline for an asset
 */
export async function runCommittee(symbol: string, timeframe: string = '15m', binanceInterval: string = '15m'): Promise<CommitteePrediction> {
  if (isRunning) {
    throw new Error('Committee analysis already in progress');
  }

  isRunning = true;
  lastRunSymbol = symbol;
  const start = performance.now();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏛️  COMMITTEE SESSION: ${symbol} @ ${timeframe} (${binanceInterval} candles)`);
  console.log(`${'═'.repeat(60)}`);

  try {
    // ─── Step 1: Fetch real market data ───────────────────
    const asset = ALL_ASSETS.find(a => a.symbol === symbol);
    if (!asset) throw new Error(`Unknown asset: ${symbol}`);

    console.log(`\n📊 [STEP 1] Fetching ${binanceInterval} candles from ${asset.type === 'crypto' ? 'Binance' : 'Forex API'}...`);
    const klines = await fetchKlines(asset, binanceInterval, 1000);
    const currentPrice = klines[klines.length - 1].close;
    console.log(`   ✅ ${klines.length} candles | Current: $${currentPrice.toLocaleString()}`);

    // ─── Step 2: Run Scraper + Journalist ─────────────────
    // Scraper: every cycle (price action changes constantly)
    // Journalist: once per hour (news doesn't change every 15 min)
    let journalistResult: JournalistResult;
    let scraperResult: ScraperResult;

    if (isJournalistCacheValid(symbol)) {
      console.log(`\n🔄 [STEP 2] Running Scraper (Journalist cached — saves API keys)...`);
      scraperResult = await runScraper(symbol, klines, currentPrice);
      journalistResult = journalistCache!.result;
      console.log(`   📰 Journalist: Using cached result (${Math.round((Date.now() - journalistCache!.timestamp) / 60000)}m old)`);
      latestScraper = scraperResult;
      latestJournalist = journalistResult;

      wsManager.broadcast('AGENT_UPDATE', { type: 'scraper', data: scraperResult });
    } else {
      console.log(`\n🔄 [STEP 2] Running Scraper + Journalist in parallel (hourly refresh)...`);
      const [scr, journalistRes] = await Promise.all([
        runScraper(symbol, klines, currentPrice),
        runJournalist(symbol, klines, currentPrice),
      ]);
      scraperResult = scr;
      journalistResult = journalistRes;

      // Cache journalist result
      journalistCache = { result: journalistResult, symbol, timestamp: Date.now() };
      console.log(`   📰 Journalist: Fresh analysis cached for 1 hour`);

      latestScraper = scraperResult;
      latestJournalist = journalistResult;

      wsManager.broadcast('AGENT_UPDATE', { type: 'scraper', data: scraperResult });
      wsManager.broadcast('AGENT_UPDATE', { type: 'journalist', data: journalistResult });
    }

    // ─── Step 3: Run Monte Carlo simulation ───────────────
    console.log(`\n🎲 [STEP 3] Running Brain Monte Carlo simulation...`);
    const priceData = klines.map(k => k.close);
    
    let mcResult = {
      win_probability: 50,
      median_target: currentPrice,
      risk_floor: currentPrice * 0.98,
      direction: 'HOLD' as string,
      up_paths_count: 50,
      down_paths_count: 50,
    };

    try {
      const brainResult = await requestSimulation({
        symbol,
        timeframe: timeframe as '15m' | '60m',
        price_data: priceData,
        current_price: currentPrice,
      });

      mcResult = {
        win_probability: brainResult.win_probability,
        median_target: brainResult.median_target_price,
        risk_floor: brainResult.percentile_5_price,
        direction: brainResult.suggested_direction,
        up_paths_count: brainResult.up_paths_count || 50,
        down_paths_count: brainResult.down_paths_count || 50,
      };
      console.log(`   ✅ MC: ${mcResult.win_probability}% ${mcResult.direction} (Long: ${mcResult.up_paths_count} | Short: ${mcResult.down_paths_count})`);
    } catch (err: any) {
      console.warn(`   ⚠️ Brain unavailable — using base MC: ${err.message}`);
    }

    // ─── Step 4: Check for emergency alerts ───────────────
    const recentChange = ((currentPrice - klines[Math.max(0, klines.length - 60)].close) / klines[Math.max(0, klines.length - 60)].close) * 100;
    const emergencies = getEmergencyAlerts(watcherAlerts.filter(a => 
      Date.now() - new Date(a.timestamp).getTime() < 300000 // Last 5 min
    ));

    // ─── Step 5: Run Prediction synthesis ─────────────────
    console.log(`\n🎯 [STEP 5] Running Prediction synthesis (Gemini Pro)...`);
    const prediction = await runPrediction(
      symbol,
      currentPrice,
      timeframe,
      scraperResult,
      journalistResult,
      mcResult,
      emergencies
    );

    latestPrediction = prediction;
    predictionHistory.push(prediction);
    if (predictionHistory.length > 100) predictionHistory.shift();

    // ─── Step 6: Persist to Supabase ──────────────────────
    console.log(`\n💾 [STEP 6] Persisting signal to Institutional Ledger (Supabase)...`);
    try {
      await sql`
        INSERT INTO public.signals (
          asset_symbol, timeframe, long_prob, short_prob, risk_level, verdict, entry_price, tp, sl
        ) VALUES (
          ${prediction.symbol},
          ${prediction.timeframe},
          ${prediction.long_prob},
          ${prediction.short_prob},
          ${prediction.risk_level},
          ${prediction.verdict},
          ${prediction.trade_plan.entry},
          ${prediction.trade_plan.take_profit},
          ${prediction.trade_plan.stop_loss}
        )
      `;
      console.log(`   ✅ Signal archived successfully.`);
    } catch (err: any) {
      console.error(`   ❌ Ledger Insert Error:`, err.message);
    }

    // Broadcast verdict ────────────────────────────────
    const wsEvent = prediction.conviction === 'EXECUTE' ? 'TRADE_ALERT' : 'SIGNAL_UPDATE';
    wsManager.broadcast(wsEvent, prediction);

    const elapsed = performance.now() - start;
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🏛️  COMMITTEE VERDICT: ${prediction.verdict} @ ${prediction.win_probability}% (${prediction.conviction})`);
    console.log(`   Entry: $${prediction.trade_plan.entry} | TP: $${prediction.trade_plan.take_profit} | SL: $${prediction.trade_plan.stop_loss}`);
    console.log(`   Leverage: ${prediction.trade_plan.leverage}x | R:R ${prediction.trade_plan.risk_reward}`);
    console.log(`   Total pipeline: ${elapsed.toFixed(0)}ms`);
    console.log(`${'─'.repeat(60)}\n`);

    return prediction;
  } catch (err: any) {
    console.error(`❌ [COMMITTEE] Pipeline failed:`, err.message);
    wsManager.broadcast('ERROR', { message: `Committee pipeline failed: ${err.message}` });
    throw err;
  } finally {
    isRunning = false;
  }
}

// ─── Watcher Background Loop ─────────────────────────────

let watcherInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the Watcher continuous monitoring loop
 */
export function startWatcher(intervalMs: number = 30000): void {
  console.log(`👁️ [WATCHER] Starting continuous monitoring (every ${intervalMs / 1000}s)`);

  watcherInterval = setInterval(async () => {
    if (!lastRunSymbol) return;

    try {
      const asset = ALL_ASSETS.find(a => a.symbol === lastRunSymbol);
      if (!asset) return;

      const ticker = await fetchTicker(asset);
      const newAlerts = await runWatcherCheck(
        lastRunSymbol,
        ticker.price,
        ticker.changePercent24h,
        0.02 // Default volatility
      );

      if (newAlerts.length > 0) {
        watcherAlerts.push(...newAlerts);
        // Keep only last 100 alerts
        if (watcherAlerts.length > 100) {
          watcherAlerts = watcherAlerts.slice(-80);
        }

        // Broadcast alerts to clients
        for (const alert of newAlerts) {
          wsManager.broadcast('WATCHER_ALERT', alert);
        }

        // Check for emergency recalculation
        const emergencies = getEmergencyAlerts(newAlerts);
        if (emergencies.length > 0 && !isRunning && lastRunSymbol) {
          console.log(`🚨 [WATCHER] EMERGENCY — Triggering recalculation!`);
          wsManager.broadcast('WATCHER_ALERT', {
            id: 'EMERGENCY',
            type: 'EMERGENCY',
            trigger: 'Recalculation',
            headline: '🚨 Emergency recalculation triggered by Watcher',
            description: emergencies.map(e => e.headline).join('; '),
            impact_score: 10,
            timestamp: new Date().toISOString(),
            requires_recalculation: true,
          });
          
          // Re-run committee
          runCommittee(lastRunSymbol, '15m').catch(err => {
            console.error('Emergency recalculation failed:', err.message);
          });
        }
      }
    } catch (err: any) {
      // Silent — watcher should not crash the system
    }
  }, intervalMs);
}

/**
 * Stop the Watcher
 */
export function stopWatcher(): void {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
  }
}

// ─── Getters ──────────────────────────────────────────────

export function getLatestPrediction(): CommitteePrediction | null {
  return latestPrediction;
}

export function getLatestScraper(): ScraperResult | null {
  return latestScraper;
}

export function getLatestJournalist(): JournalistResult | null {
  return latestJournalist;
}

export function getWatcherAlerts(): WatcherAlert[] {
  return watcherAlerts;
}

export function getPredictionHistory(): CommitteePrediction[] {
  return predictionHistory;
}

export function isCommitteeRunning(): boolean {
  return isRunning;
}
