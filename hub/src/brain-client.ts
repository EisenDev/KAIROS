// ============================================================
// KAIROS PRO — Brain Client
// HTTP client for communicating with The Brain (Python/FastAPI)
// ============================================================

import type { SimulationResult, SimulationRequest } from './types.js';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:8400';

/**
 * Request a Monte Carlo simulation from The Brain
 */
export async function requestSimulation(request: SimulationRequest): Promise<SimulationResult> {
  const response = await fetch(`${BRAIN_URL}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brain simulation failed [${response.status}]: ${error}`);
  }

  return response.json() as Promise<SimulationResult>;
}

/**
 * Health check for The Brain service
 */
export async function checkBrainHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BRAIN_URL}/health`, { 
      signal: AbortSignal.timeout(3000) 
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate synthetic price data for demo/testing
 * Simulates realistic BTC-like price movements
 */
export function generateSyntheticPrices(basePrice: number, count: number = 1000): number[] {
  const prices: number[] = [basePrice];
  const volatility = 0.002; // 0.2% per step
  const drift = 0.00001; // slight upward drift

  for (let i = 1; i < count; i++) {
    const change = prices[i - 1] * (drift + volatility * (Math.random() * 2 - 1));
    prices.push(Math.round((prices[i - 1] + change) * 100) / 100);
  }

  return prices;
}
