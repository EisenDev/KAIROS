// ============================================================
// KAIROS PRO v3.0 — Scraper Agent
// Technical analysis: support/resistance, chart patterns
// Model: Gemini 2.5 Flash
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { keyManager } from '../api-key-manager.js';
import type { KlineData } from '../market-data.js';

export interface ChartPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
}

export interface ScraperResult {
  support_levels: number[];
  resistance_levels: number[];
  chart_patterns: ChartPattern[];
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  key_levels_analysis: string;
  technical_summary: string;
  timestamp: string;
}

const MODEL = process.env.SCRAPER_MODEL || 'gemini-2.5-flash';

/**
 * Run the Scraper agent — identifies support/resistance and chart patterns
 */
export async function runScraper(
  symbol: string,
  klines: KlineData[],
  currentPrice: number
): Promise<ScraperResult> {
  console.log(`🔍 [SCRAPER] Analyzing ${symbol} — ${klines.length} candles...`);

  if (!keyManager.hasKeys('flash')) {
    console.warn('⚠️ [SCRAPER] No API keys — returning computed analysis');
    return computeFallbackAnalysis(klines, currentPrice);
  }

  try {
    const apiKey = keyManager.getKey('flash');
    const ai = new GoogleGenAI({ apiKey });

    // Prepare condensed kline summary for the prompt
    const recentKlines = klines.slice(-100);
    const ohlcSummary = recentKlines.map((k, i) => 
      `${i}: O=${k.open} H=${k.high} L=${k.low} C=${k.close} V=${k.volume}`
    ).join('\n');

    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const priceRange = `Range: ${Math.min(...lows).toFixed(2)} - ${Math.max(...highs).toFixed(2)}`;

    const prompt = `You are an expert technical analyst. Analyze this ${symbol} price data and identify key technical levels.

Current Price: $${currentPrice}
${priceRange}
Total Candles: ${klines.length} (1-minute interval)

Recent 100 candles (OHLCV):
${ohlcSummary}

Return a JSON object with EXACTLY this structure:
{
  "support_levels": [number, number, number],
  "resistance_levels": [number, number, number],
  "chart_patterns": [
    {"name": "pattern name", "type": "bullish|bearish|neutral", "confidence": 0.0-1.0, "description": "brief explanation"}
  ],
  "trend": "BULLISH|BEARISH|NEUTRAL",
  "key_levels_analysis": "2-3 sentence analysis of key price levels",
  "technical_summary": "3-4 sentence overall technical assessment"
}

Identify the 3 strongest support and 3 strongest resistance levels. Look for patterns like double top/bottom, head & shoulders, triangles, flags, channels. Return ONLY valid JSON.`;

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

    console.log(`✅ [SCRAPER] Found ${parsed.chart_patterns?.length || 0} patterns, trend: ${parsed.trend}`);

    return {
      support_levels: parsed.support_levels || [],
      resistance_levels: parsed.resistance_levels || [],
      chart_patterns: parsed.chart_patterns || [],
      trend: parsed.trend || 'NEUTRAL',
      key_levels_analysis: parsed.key_levels_analysis || '',
      technical_summary: parsed.technical_summary || '',
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`❌ [SCRAPER] Failed:`, err.message);
    return computeFallbackAnalysis(klines, currentPrice);
  }
}

/**
 * Algorithmic fallback when no API keys are available
 */
function computeFallbackAnalysis(klines: KlineData[], currentPrice: number): ScraperResult {
  const closes = klines.map(k => k.close);
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);

  // Simple pivot-based support/resistance
  const recentHighs = highs.slice(-200).sort((a, b) => b - a);
  const recentLows = lows.slice(-200).sort((a, b) => a - b);

  const resistance = [
    recentHighs[0],
    recentHighs[Math.floor(recentHighs.length * 0.1)],
    recentHighs[Math.floor(recentHighs.length * 0.25)],
  ].map(p => Math.round(p * 100) / 100);

  const support = [
    recentLows[Math.floor(recentLows.length * 0.25)],
    recentLows[Math.floor(recentLows.length * 0.1)],
    recentLows[0],
  ].map(p => Math.round(p * 100) / 100);

  // Simple trend detection
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const trend = sma20 > sma50 ? 'BULLISH' : sma20 < sma50 ? 'BEARISH' : 'NEUTRAL';

  return {
    support_levels: support,
    resistance_levels: resistance,
    chart_patterns: [{
      name: 'SMA Crossover',
      type: trend === 'BULLISH' ? 'bullish' : trend === 'BEARISH' ? 'bearish' : 'neutral',
      confidence: 0.6,
      description: `SMA20 ${sma20 > sma50 ? 'above' : 'below'} SMA50 — ${trend.toLowerCase()} momentum`,
    }],
    trend,
    key_levels_analysis: `Support at $${support[0]}, resistance at $${resistance[0]}. Current price $${currentPrice} is ${currentPrice > sma20 ? 'above' : 'below'} the 20-period average.`,
    technical_summary: `Algorithmic analysis (no AI key): ${trend} trend detected. Price is trading ${currentPrice > sma20 ? 'above' : 'below'} key moving averages.`,
    timestamp: new Date().toISOString(),
  };
}
