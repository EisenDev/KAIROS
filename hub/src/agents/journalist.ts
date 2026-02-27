// ============================================================
// KAIROS PRO v3.0 — Journalist Agent
// Sentiment analysis and market narrative
// Model: Gemini 2.5 Flash
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { keyManager } from '../api-key-manager.js';
import type { KlineData } from '../market-data.js';

export interface Finding {
  headline: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface JournalistResult {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentiment_score: number; // -100 to +100
  findings: Finding[];
  narrative: string;
  key_factors: string[];
  market_mood: string;
  timestamp: string;
}

const MODEL = process.env.JOURNALIST_MODEL || 'gemini-2.5-flash';

// ─── News Headline Scraper ────────────────────────────────

// Symbol to search query mapping
const SYMBOL_SEARCH_TERMS: Record<string, string> = {
  BTCUSDT: 'Bitcoin BTC crypto',
  ETHUSDT: 'Ethereum ETH crypto',
  SOLUSDT: 'Solana SOL crypto',
  XRPUSDT: 'XRP Ripple crypto',
  BNBUSDT: 'BNB Binance crypto',
  EURUSD: 'EUR USD forex currency',
  GBPUSD: 'GBP USD forex pound',
  USDJPY: 'USD JPY forex yen Japan',
  AUDUSD: 'AUD USD forex Australian dollar',
  USDCHF: 'USD CHF forex Swiss franc',
};

/**
 * Fetch real news headlines from Google News RSS
 */
async function fetchNewsHeadlines(symbol: string): Promise<string[]> {
  const searchTerms = SYMBOL_SEARCH_TERMS[symbol] || symbol;
  const query = encodeURIComponent(searchTerms);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'KAIROS-PRO/3.0' },
    });
    if (!res.ok) return [];

    const xml = await res.text();

    // Simple XML title extraction (no need for heavy XML parser)
    const titles: string[] = [];
    const titleRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>|<item>[\s\S]*?<title>(.*?)<\/title>/g;
    let match;
    while ((match = titleRegex.exec(xml)) !== null && titles.length < 8) {
      const title = (match[1] || match[2] || '').trim();
      if (title && !title.includes('Google News')) {
        titles.push(title);
      }
    }

    // Fallback: simpler regex
    if (titles.length === 0) {
      const simpleRegex = /<title>([^<]+)<\/title>/g;
      while ((match = simpleRegex.exec(xml)) !== null && titles.length < 8) {
        const title = match[1].trim();
        if (title && title !== 'Google News' && !title.includes('search -')) {
          titles.push(title);
        }
      }
    }

    if (titles.length > 0) {
      console.log(`📰 [NEWS] Fetched ${titles.length} headlines for ${symbol}`);
    }
    return titles;
  } catch (err) {
    console.warn(`⚠️ [NEWS] Failed to fetch headlines for ${symbol}`);
    return [];
  }
}

/**
 * Run the Journalist agent — analyzes market sentiment and narrative
 */
export async function runJournalist(
  symbol: string,
  klines: KlineData[],
  currentPrice: number
): Promise<JournalistResult> {
  console.log(`📰 [JOURNALIST] Analyzing sentiment for ${symbol}...`);

  if (!keyManager.hasKeys('flash')) {
    console.warn('⚠️ [JOURNALIST] No API keys — returning computed sentiment');
    return computeFallbackSentiment(symbol, klines, currentPrice);
  }

  try {
    const apiKey = keyManager.getKey('flash');
    const ai = new GoogleGenAI({ apiKey });

    // Fetch real news headlines + calculate metrics in parallel
    const [newsHeadlines, metrics] = await Promise.all([
      fetchNewsHeadlines(symbol),
      (async () => {
        const recent = klines.slice(-60);
        const oldPrice = recent[0].close;
        const changePercent = ((currentPrice - oldPrice) / oldPrice * 100).toFixed(2);
        const volumes = recent.map(k => k.volume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const latestVolume = volumes[volumes.length - 1];
        const volumeRatio = (latestVolume / avgVolume).toFixed(2);
        const hourlyCloses: number[] = [];
        for (let i = 0; i < Math.min(klines.length, 600); i += 60) {
          const slice = klines.slice(i, i + 60);
          if (slice.length > 0) hourlyCloses.push(slice[slice.length - 1].close);
        }
        return { changePercent, volumeRatio, hourlyCloses };
      })(),
    ]);

    // Build news section for the prompt
    const newsSection = newsHeadlines.length > 0
      ? `\n═══ REAL-TIME NEWS HEADLINES ═══\n${newsHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : '';

    const prompt = `You are an expert financial journalist and market analyst. Analyze the current market conditions for ${symbol}.

Current Price: $${currentPrice}
1-Hour Change: ${metrics.changePercent}%
Volume Ratio (current/avg): ${metrics.volumeRatio}x
Recent Hourly Prices: ${metrics.hourlyCloses.map(p => `$${p}`).join(' → ')}
${newsSection}

Based on this price action${newsHeadlines.length > 0 ? ', the real news headlines above,' : ''} and your knowledge of market dynamics, provide:
1. Overall market sentiment assessment
2. Key findings that could impact price (reference actual headlines if provided)
3. A market narrative explaining WHY the price is moving this way

Return a JSON object with EXACTLY this structure:
{
  "sentiment": "BULLISH|BEARISH|NEUTRAL",
  "sentiment_score": -100 to 100,
  "findings": [
    {"headline": "finding title", "impact": "HIGH|MEDIUM|LOW", "sentiment": "POSITIVE|NEGATIVE|NEUTRAL"}
  ],
  "narrative": "2-3 paragraph market narrative explaining current conditions",
  "key_factors": ["factor 1", "factor 2", "factor 3"],
  "market_mood": "one-sentence mood summary like 'Risk-on rally with strong institutional buying'"
}

Provide 3-5 findings. Be specific and analytical. Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      },
    });

    const text = response.text ?? '{}';
    const parsed = JSON.parse(text);

    console.log(`✅ [JOURNALIST] Sentiment: ${parsed.sentiment} (${parsed.sentiment_score}), ${parsed.findings?.length || 0} findings`);

    return {
      sentiment: parsed.sentiment || 'NEUTRAL',
      sentiment_score: parsed.sentiment_score || 0,
      findings: parsed.findings || [],
      narrative: parsed.narrative || '',
      key_factors: parsed.key_factors || [],
      market_mood: parsed.market_mood || '',
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`❌ [JOURNALIST] Failed:`, err.message);
    return computeFallbackSentiment(symbol, klines, currentPrice);
  }
}

/**
 * Algorithmic fallback sentiment analysis
 */
function computeFallbackSentiment(
  symbol: string,
  klines: KlineData[],
  currentPrice: number
): JournalistResult {
  const recent = klines.slice(-60);
  const oldPrice = recent[0].close;
  const change = ((currentPrice - oldPrice) / oldPrice) * 100;

  const sentiment = change > 0.5 ? 'BULLISH' : change < -0.5 ? 'BEARISH' : 'NEUTRAL';
  const score = Math.max(-100, Math.min(100, Math.round(change * 20)));

  return {
    sentiment,
    sentiment_score: score,
    findings: [
      {
        headline: `${symbol} ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}% in the last hour`,
        impact: Math.abs(change) > 1 ? 'HIGH' : 'MEDIUM',
        sentiment: change > 0 ? 'POSITIVE' : change < 0 ? 'NEGATIVE' : 'NEUTRAL',
      },
      {
        headline: `Price at $${currentPrice.toLocaleString()} — ${change > 0 ? 'bullish' : 'bearish'} momentum`,
        impact: 'MEDIUM',
        sentiment: change > 0 ? 'POSITIVE' : 'NEGATIVE',
      },
    ],
    narrative: `Algorithmic analysis (no AI key): ${symbol} is showing ${sentiment.toLowerCase()} signals with a ${Math.abs(change).toFixed(2)}% change. Volume patterns suggest ${Math.abs(change) > 1 ? 'strong' : 'moderate'} conviction.`,
    key_factors: [`${Math.abs(change).toFixed(2)}% price movement`, 'Current market structure', 'Volume analysis'],
    market_mood: `${sentiment} bias with ${Math.abs(change) > 1 ? 'strong' : 'moderate'} momentum`,
    timestamp: new Date().toISOString(),
  };
}
