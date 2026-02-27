// ============================================================
// KAIROS PRO v3.0 — Watcher Agent
// Real-time news monitoring — triggers emergency recalculation
// Model: Gemini 3 Flash (low latency)
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { keyManager } from '../api-key-manager.js';

export interface WatcherAlert {
  id: string;
  type: 'EMERGENCY' | 'WARNING' | 'INFO';
  trigger: string;
  headline: string;
  description: string;
  impact_score: number; // 1-10
  timestamp: string;
  requires_recalculation: boolean;
}

// Emergency trigger keywords
const EMERGENCY_KEYWORDS = ['war', 'interest rate', 'crash', 'default', 'sanctions', 'recession', 'collapse', 'hack', 'exploit', 'fed ', 'fomc', 'black swan'];

const MODEL = process.env.WATCHER_MODEL || 'gemini-2.0-flash';
let alertCounter = 0;

function generateAlertId(): string {
  alertCounter++;
  return `WA-${Date.now().toString(36).toUpperCase()}-${alertCounter.toString().padStart(3, '0')}`;
}

/**
 * Run a single Watcher check cycle
 * Analyzes current market context for high-impact events
 */
export async function runWatcherCheck(
  symbol: string,
  currentPrice: number,
  priceChange1h: number,
  volatility: number
): Promise<WatcherAlert[]> {
  const alerts: WatcherAlert[] = [];

  // ─── Algorithmic checks (always run) ────────────────────
  
  // Flash crash detection (>3% move in 1h)
  if (Math.abs(priceChange1h) > 3) {
    alerts.push({
      id: generateAlertId(),
      type: 'EMERGENCY',
      trigger: Math.abs(priceChange1h) > 5 ? 'Crash' : 'High Volatility',
      headline: `⚠️ ${symbol} ${priceChange1h > 0 ? 'SURGING' : 'CRASHING'} ${Math.abs(priceChange1h).toFixed(1)}% in 1 hour`,
      description: `Abnormal price movement detected. Current: $${currentPrice.toLocaleString()}. This may indicate a major market event.`,
      impact_score: Math.min(10, Math.round(Math.abs(priceChange1h) * 1.5)),
      timestamp: new Date().toISOString(),
      requires_recalculation: true,
    });
  }

  // High volatility alert (>2x normal)
  if (volatility > 0.04) {
    alerts.push({
      id: generateAlertId(),
      type: 'WARNING',
      trigger: 'High Volatility',
      headline: `📊 Elevated volatility detected on ${symbol}`,
      description: `Volatility at ${(volatility * 100).toFixed(1)}% — ${(volatility / 0.02).toFixed(1)}x normal levels. Exercise caution.`,
      impact_score: Math.min(8, Math.round(volatility * 200)),
      timestamp: new Date().toISOString(),
      requires_recalculation: false,
    });
  }

  // ─── AI-powered analysis (if keys available) ────────────
  if (keyManager.hasKeys('watcher')) {
    try {
      const aiAlerts = await runAIWatcherCheck(symbol, currentPrice, priceChange1h);
      alerts.push(...aiAlerts);
    } catch (err: any) {
      console.error(`❌ [WATCHER] AI check failed:`, err.message);
    }
  }

  if (alerts.length > 0) {
    console.log(`👁️ [WATCHER] ${alerts.length} alerts for ${symbol}:`);
    for (const a of alerts) {
      console.log(`   ${a.type}: ${a.headline}`);
    }
  }

  return alerts;
}

/**
 * AI-powered news and event analysis
 */
async function runAIWatcherCheck(
  symbol: string,
  currentPrice: number,
  priceChange1h: number
): Promise<WatcherAlert[]> {
  const apiKey = keyManager.getKey('watcher');
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a real-time market surveillance agent monitoring ${symbol} at $${currentPrice} (${priceChange1h > 0 ? '+' : ''}${priceChange1h.toFixed(2)}% 1h change).

Assess the current market environment. Consider:
1. Is there any major geopolitical news (wars, sanctions, treaties)?
2. Are there central bank decisions expected (interest rates, FOMC, ECB)?
3. Is there any crypto-specific news (hacks, regulation, ETF decisions)?
4. Could the current price action indicate a market crash or black swan event?

Return a JSON array of alerts (empty array [] if no significant events detected):
[
  {
    "type": "EMERGENCY|WARNING|INFO",
    "trigger": "War|Interest Rate|Crash|Regulation|Hack|Macro",
    "headline": "concise alert headline",
    "description": "1-2 sentence explanation",
    "impact_score": 1-10,
    "requires_recalculation": true/false
  }
]

Only flag EMERGENCY if the event would cause >5% market impact. Be conservative — most checks should return []. Return ONLY valid JSON array.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const text = response.text ?? '[]';
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) return [];

  return parsed.map((a: any) => ({
    id: generateAlertId(),
    type: a.type || 'INFO',
    trigger: a.trigger || 'Unknown',
    headline: a.headline || '',
    description: a.description || '',
    impact_score: a.impact_score || 1,
    timestamp: new Date().toISOString(),
    requires_recalculation: a.requires_recalculation || false,
  }));
}

/**
 * Check if any alert text contains emergency keywords
 */
export function containsEmergencyTrigger(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => lower.includes(keyword));
}

/**
 * Filter alerts that require emergency recalculation
 */
export function getEmergencyAlerts(alerts: WatcherAlert[]): WatcherAlert[] {
  return alerts.filter(a => a.requires_recalculation || a.type === 'EMERGENCY');
}
