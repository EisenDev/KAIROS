// ============================================================
// KAIROS PRO — Verdict Engine
// Transforms raw simulation results into actionable trade verdicts
// ============================================================

import type { SimulationResult, TradeVerdict, ConvictionLevel } from './types.js';

let verdictCounter = 0;

function generateVerdictId(): string {
  verdictCounter++;
  const ts = Date.now().toString(36).toUpperCase();
  const seq = verdictCounter.toString(36).toUpperCase().padStart(4, '0');
  return `KRS-${ts}-${seq}`;
}

/**
 * Determine conviction level based on win probability
 */
function getConvictionLevel(probability: number): ConvictionLevel {
  if (probability >= 80) return 'EXECUTE';
  if (probability >= 65) return 'CAUTION';
  return 'HOLD';
}

/**
 * Calculate dynamic leverage based on probability and volatility
 */
function calculateLeverage(probability: number, suggestedLeverage: number): number {
  if (probability >= 85) return Math.min(suggestedLeverage, 20);
  if (probability >= 80) return Math.min(suggestedLeverage, 10);
  if (probability >= 70) return Math.min(suggestedLeverage, 5);
  return Math.min(suggestedLeverage, 3);
}

/**
 * Calculate risk/reward ratio
 */
function calculateRiskReward(entry: number, tp: number, sl: number, direction: 'LONG' | 'SHORT'): number {
  if (direction === 'LONG') {
    const reward = tp - entry;
    const risk = entry - sl;
    return risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  } else {
    const reward = entry - tp;
    const risk = sl - entry;
    return risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  }
}

/**
 * Generate verdict message
 */
function generateMessage(verdict: ConvictionLevel, direction: string, probability: number): string {
  switch (verdict) {
    case 'EXECUTE':
      return `⚡ HIGH CONVICTION: Go ${direction}. ${probability}% probability detected across 100 Monte Carlo paths. Execute with precision.`;
    case 'CAUTION':
      return `⚠️ POTENTIAL SETUP: ${probability}% probability. Monitor volume confirmation before entry.`;
    case 'HOLD':
      return `🔇 INCONCLUSIVE: ${probability}% probability. Data insufficient. Do not take the trade.`;
  }
}

/**
 * Transform a SimulationResult from The Brain into an actionable TradeVerdict
 */
export function generateVerdict(sim: SimulationResult): TradeVerdict {
  const status = getConvictionLevel(sim.win_probability);
  const leverage = calculateLeverage(sim.win_probability, sim.suggested_leverage);
  const marginPercent = Math.round((1 / leverage) * 100);

  const entry = sim.current_price;
  const tp = sim.mode_target_price;
  const sl = sim.percentile_5_price;
  const rr = calculateRiskReward(entry, tp, sl, sim.suggested_direction);

  return {
    id: generateVerdictId(),
    symbol: sim.symbol,
    status,
    direction: sim.suggested_direction,
    probability: sim.win_probability,
    entry_price: entry,
    take_profit: tp,
    stop_loss: sl,
    leverage,
    margin_percent: marginPercent,
    risk_reward_ratio: rr,
    timeframe: sim.timeframe,
    message: generateMessage(status, sim.suggested_direction, sim.win_probability),
    timestamp: new Date().toISOString(),
    simulation_meta: {
      total_simulations: sim.simulation_count,
      winning_paths: sim.consensus_paths,
      mode_target: sim.mode_target_price,
      floor_price: sim.percentile_5_price,
    },
  };
}

/**
 * Check if verdict is high-conviction (should trigger TRADE_ALERT)
 */
export function isHighConviction(verdict: TradeVerdict): boolean {
  return verdict.status === 'EXECUTE';
}

/**
 * Check if verdict warrants a warning sound
 */
export function isWarningLevel(verdict: TradeVerdict): boolean {
  return verdict.status === 'CAUTION';
}
