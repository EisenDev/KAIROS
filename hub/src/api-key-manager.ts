// ============================================================
// KAIROS PRO v3.0 — API Key Manager
// Rotates through pools of Gemini API keys per agent type
// ============================================================

import 'dotenv/config';

type AgentPool = 'flash' | 'watcher' | 'pro';

interface KeyPool {
  keys: string[];
  index: number;
  totalCalls: number;
  lastUsed: string | null;
}

class ApiKeyManager {
  private pools: Map<AgentPool, KeyPool> = new Map();

  constructor() {
    this.loadPools();
  }

  private loadPools(): void {
    const flashKeys = (process.env.GEMINI_KEYS_FLASH || '').split(',').map(k => k.trim()).filter(Boolean);
    const watcherKeys = (process.env.GEMINI_KEYS_WATCHER || '').split(',').map(k => k.trim()).filter(Boolean);
    const proKeys = (process.env.GEMINI_KEYS_PRO || '').split(',').map(k => k.trim()).filter(Boolean);

    // If specific pools are empty, fall back to flash keys (most common)
    const fallback = flashKeys.length > 0 ? flashKeys : [''];

    this.pools.set('flash', {
      keys: flashKeys.length > 0 ? flashKeys : fallback,
      index: 0,
      totalCalls: 0,
      lastUsed: null,
    });

    this.pools.set('watcher', {
      keys: watcherKeys.length > 0 ? watcherKeys : fallback,
      index: 0,
      totalCalls: 0,
      lastUsed: null,
    });

    this.pools.set('pro', {
      keys: proKeys.length > 0 ? proKeys : fallback,
      index: 0,
      totalCalls: 0,
      lastUsed: null,
    });

    console.log(`🔑 [KEY MGR] Loaded key pools:`);
    console.log(`   Flash:   ${this.pools.get('flash')!.keys.length} keys`);
    console.log(`   Watcher: ${this.pools.get('watcher')!.keys.length} keys`);
    console.log(`   Pro:     ${this.pools.get('pro')!.keys.length} keys`);
  }

  /**
   * Get the next API key from a pool (round-robin rotation)
   */
  getKey(pool: AgentPool): string {
    const p = this.pools.get(pool);
    if (!p || p.keys.length === 0 || p.keys[0] === '') {
      throw new Error(`No API keys configured for pool: ${pool}. Set GEMINI_KEYS_${pool.toUpperCase()} in .env`);
    }

    const key = p.keys[p.index];
    p.index = (p.index + 1) % p.keys.length;
    p.totalCalls++;
    p.lastUsed = new Date().toISOString();

    return key;
  }

  /**
   * Check if a pool has valid keys configured
   */
  hasKeys(pool: AgentPool): boolean {
    const p = this.pools.get(pool);
    return !!(p && p.keys.length > 0 && p.keys[0] !== '');
  }

  /**
   * Get usage stats for all pools
   */
  getStats(): Record<string, { keyCount: number; totalCalls: number; lastUsed: string | null }> {
    const stats: Record<string, any> = {};
    for (const [name, pool] of this.pools) {
      stats[name] = {
        keyCount: pool.keys.filter(k => k !== '').length,
        totalCalls: pool.totalCalls,
        lastUsed: pool.lastUsed,
      };
    }
    return stats;
  }
}

// Singleton
export const keyManager = new ApiKeyManager();
export type { AgentPool };
