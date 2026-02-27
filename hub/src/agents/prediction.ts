// ============================================================
// KAIROS PRO v3.5 — Prediction Agent (Execution Layer)
// 70% threshold for bi-directional signal, ATR-based SL
// Model: Gemini 3 Pro (Reasoning)
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { keyManager } from '../api-key-manager.js';
import type { ScraperResult } from './scraper.js';
import type { JournalistResult } from './journalist.js';
import type { WatcherAlert } from './watcher.js';

export interface TradePlan {
  entry: number;
  take_profit: number;
  stop_loss: number;
  leverage: number;
  margin_percent: number;
  risk_reward: number;
}

export interface CommitteePrediction {
  id: string;
  symbol: string;
  timeframe: string;
  win_probability: number;
  long_prob: number;
  short_prob: number;
  risk_level: string;
  verdict: 'LONG' | 'SHORT' | 'HOLD';
  conviction: 'EXECUTE' | 'CAUTION' | 'HOLD';
  trade_plan: TradePlan;
  reasoning: string;
  scraper_summary: string;
  journalist_summary: string;
  emergency_context: string | null;
  timestamp: string;
  computation_ms: number;
}

const MODEL = process.env.PREDICTION_MODEL || 'gemini-3-pro-preview';
let predictionCounter = 0;

function generatePredictionId(): string {
  predictionCounter++;
  return `KP-${Date.now().toString(36).toUpperCase()}-${predictionCounter.toString().padStart(4, '0')}`;
}

/**
 * Run the Prediction agent — synthesizes all committee data into a final verdict
 */
export async function runPrediction(
  symbol: string,
  currentPrice: number,
  timeframe: string,
  scraper: ScraperResult,
  journalist: JournalistResult,
  mcResult: { win_probability: number; median_target: number; risk_floor: number; direction: string; up_paths_count: number; down_paths_count: number },
  emergencyAlerts: WatcherAlert[] = []
): Promise<CommitteePrediction> {
  const start = performance.now();
  console.log(`🎯 [PREDICTION] Synthesizing committee data for ${symbol}...`);

  if (!keyManager.hasKeys('pro')) {
    console.warn('⚠️ [PREDICTION] No Pro API keys — using algorithmic synthesis');
    return buildAlgorithmicPrediction(symbol, currentPrice, timeframe, scraper, journalist, mcResult, emergencyAlerts, start);
  }

  try {
    const apiKey = keyManager.getKey('pro');
    const ai = new GoogleGenAI({ apiKey });

    const emergencyContext = emergencyAlerts.length > 0
      ? `\n\n⚠️ EMERGENCY ALERTS:\n${emergencyAlerts.map(a => `- [${a.type}] ${a.headline}: ${a.description}`).join('\n')}`
      : '';

    const prompt = `You are a Senior Quant Portfolio Manager at a top hedge fund. You are making the FINAL trading decision based on multiple data sources.

═══ ASSET: ${symbol} @ $${currentPrice} ═══
Timeframe: ${timeframe}

═══ TECHNICAL ANALYSIS (Scraper Agent) ═══
Trend: ${scraper.trend}
Support Levels: ${scraper.support_levels.map(s => `$${s}`).join(', ')}
Resistance Levels: ${scraper.resistance_levels.map(r => `$${r}`).join(', ')}
Patterns: ${scraper.chart_patterns.map(p => `${p.name} (${p.type}, ${(p.confidence * 100).toFixed(0)}%)`).join(', ')}
Summary: ${scraper.technical_summary}

═══ SENTIMENT ANALYSIS (Journalist Agent) ═══
Sentiment: ${journalist.sentiment} (Score: ${journalist.sentiment_score}/100)
Market Mood: ${journalist.market_mood}
Key Findings:
${journalist.findings.map(f => `- [${f.impact}] ${f.headline} (${f.sentiment})`).join('\n')}
Narrative: ${journalist.narrative}

═══ MONTE CARLO SIMULATION (Brain Engine) ═══
Win Probability: ${mcResult.win_probability}%
Direction Bias: ${mcResult.direction}
Median Target: $${mcResult.median_target}
Risk Floor (5th percentile): $${mcResult.risk_floor}
${emergencyContext}

═══ YOUR TASK ═══
Run your mental model of 100 market simulations. Synthesize ALL the above data. Output your FINAL verdict.

Return a JSON object with EXACTLY this structure:
{
  "win_probability": 0-100,
  "verdict": "LONG|SHORT|HOLD",
  "trade_plan": {
    "entry": exact_price,
    "take_profit": tp_price,
    "stop_loss": sl_price,
    "leverage": 10,
    "margin_percent": 10,
    "risk_reward": ratio
  },
  "reasoning": "3-5 sentence explanation of your decision, referencing specific data from each agent",
  "scraper_summary": "1 sentence summary of key technical takeaway",
  "journalist_summary": "1 sentence summary of key sentiment takeaway"
}

Rules:
- THRESHOLD: ≥70% for LONG or SHORT signal. 50-65% = HOLD.
- If probability < 70%, verdict MUST be HOLD with leverage 1.
- Default plan: 10x Margin / 10% Leverage.
- ENTRY: Current price ($${currentPrice}).
- TP: Median price of winning simulation paths.
- SL: Risk Floor calculated via ATR (Average True Range) from the price data.
- Risk-reward ratio must be >= 1.5 for any LONG/SHORT verdict.
- If both LONG and SHORT have <70%, verdict is HOLD.
Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const text = response.text ?? '{}';
    const parsed = JSON.parse(text);
    const elapsed = performance.now() - start;

    const conviction = parsed.win_probability >= 70 ? 'EXECUTE'
                     : parsed.win_probability >= 50 ? 'CAUTION'
                     : 'HOLD';

    const maxProb = Math.max(mcResult.up_paths_count, mcResult.down_paths_count);
    const risk_level = maxProb >= 80 ? 'LOW RISK'
                       : maxProb >= 70 ? 'MEDIUM RISK'
                       : maxProb >= 60 ? 'HIGH RISK'
                       : 'NEUTRAL';

    console.log(`✅ [PREDICTION] Verdict: ${parsed.verdict} @ ${parsed.win_probability}% (${conviction}) — ${elapsed.toFixed(0)}ms`);

    return {
      id: generatePredictionId(),
      symbol,
      timeframe,
      win_probability: parsed.win_probability || 0,
      long_prob: mcResult.up_paths_count,
      short_prob: mcResult.down_paths_count,
      risk_level,
      verdict: parsed.verdict || 'HOLD',
      conviction,
      trade_plan: {
        entry: parsed.trade_plan?.entry || currentPrice,
        take_profit: parsed.trade_plan?.take_profit || currentPrice,
        stop_loss: parsed.trade_plan?.stop_loss || currentPrice,
        leverage: parsed.trade_plan?.leverage || 1,
        margin_percent: parsed.trade_plan?.margin_percent || 100,
        risk_reward: parsed.trade_plan?.risk_reward || 0,
      },
      reasoning: parsed.reasoning || '',
      scraper_summary: parsed.scraper_summary || scraper.technical_summary,
      journalist_summary: parsed.journalist_summary || journalist.narrative,
      emergency_context: emergencyAlerts.length > 0
        ? emergencyAlerts.map(a => a.headline).join('; ')
        : null,
      timestamp: new Date().toISOString(),
      computation_ms: Math.round(elapsed),
    };
  } catch (err: any) {
    console.error(`❌ [PREDICTION] Failed:`, err.message);
    return buildAlgorithmicPrediction(symbol, currentPrice, timeframe, scraper, journalist, mcResult, emergencyAlerts, start);
  }
}

/**
 * Algorithmic fallback prediction when no API keys available
 */
function buildAlgorithmicPrediction(
  symbol: string,
  currentPrice: number,
  timeframe: string,
  scraper: ScraperResult,
  journalist: JournalistResult,
  mcResult: { win_probability: number; median_target: number; risk_floor: number; direction: string; up_paths_count: number; down_paths_count: number },
  emergencyAlerts: WatcherAlert[],
  start: number
): CommitteePrediction {
  // Weighted ensemble of signals
  const technicalScore = scraper.trend === 'BULLISH' ? 1 : scraper.trend === 'BEARISH' ? -1 : 0;
  const sentimentScore = journalist.sentiment_score / 100;
  const mcScore = (mcResult.win_probability - 50) / 50;

  const composite = (technicalScore * 0.3 + sentimentScore * 0.3 + mcScore * 0.4);
  const probability = Math.round(Math.max(0, Math.min(100, 50 + composite * 40)));

  // Emergency override: reduce conviction
  const emergencyPenalty = emergencyAlerts.length > 0 ? 15 : 0;
  const adjustedProbability = Math.max(0, probability - emergencyPenalty);

  // v3.5 thresholds: 70% = signal, 50-65% = HOLD
  const verdict = adjustedProbability >= 70
    ? (composite > 0 ? 'LONG' : 'SHORT')
    : 'HOLD';

  const conviction = adjustedProbability >= 70 ? 'EXECUTE'
                   : adjustedProbability >= 50 ? 'CAUTION'
                   : 'HOLD';

  const maxProb = Math.max(mcResult.up_paths_count, mcResult.down_paths_count);
  const risk_level = maxProb >= 80 ? 'LOW RISK'
                     : maxProb >= 70 ? 'MEDIUM RISK'
                     : maxProb >= 60 ? 'HIGH RISK'
                     : 'NEUTRAL';

  // 10x margin / 10% leverage for signals
  const leverage = verdict === 'HOLD' ? 1 : 10;
  const tp = verdict === 'LONG'
    ? (scraper.resistance_levels[0] || currentPrice * 1.02)
    : (scraper.support_levels[0] || currentPrice * 0.98);
  const sl = verdict === 'LONG'
    ? (scraper.support_levels[0] || currentPrice * 0.98)
    : (scraper.resistance_levels[0] || currentPrice * 1.02);

  const riskReward = Math.abs(tp - currentPrice) / Math.abs(currentPrice - sl) || 0;

  return {
    id: generatePredictionId(),
    symbol,
    timeframe,
    win_probability: adjustedProbability,
    long_prob: mcResult.up_paths_count,
    short_prob: mcResult.down_paths_count,
    risk_level,
    verdict,
    conviction,
    trade_plan: {
      entry: currentPrice,
      take_profit: Math.round(tp * 100) / 100,
      stop_loss: Math.round(sl * 100) / 100,
      leverage,
      margin_percent: Math.round(100 / leverage),
      risk_reward: Math.round(riskReward * 100) / 100,
    },
    reasoning: `Algorithmic synthesis: Technical ${scraper.trend}, Sentiment ${journalist.sentiment} (${journalist.sentiment_score}), MC ${mcResult.win_probability}% ${mcResult.direction}. Composite score: ${(composite * 100).toFixed(0)}%.${emergencyAlerts.length > 0 ? ` Emergency penalty applied (-${emergencyPenalty}%).` : ''}`,
    scraper_summary: scraper.technical_summary,
    journalist_summary: journalist.market_mood,
    emergency_context: emergencyAlerts.length > 0 ? emergencyAlerts.map(a => a.headline).join('; ') : null,
    timestamp: new Date().toISOString(),
    computation_ms: Math.round(performance.now() - start),
  };
}
