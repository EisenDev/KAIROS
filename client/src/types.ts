// ============================================================
// KAIROS PRO — Shared Types (Client)
// ============================================================

export type ConvictionLevel = 'EXECUTE' | 'CAUTION' | 'HOLD';
export type TradeDirection = 'LONG' | 'SHORT' | 'HOLD';
export type WSEventType = 'TRADE_ALERT' | 'SIGNAL_UPDATE' | 'AGENT_UPDATE' | 'WATCHER_ALERT' | 'SYSTEM_STATUS' | 'HEARTBEAT' | 'PRICE_FEED' | 'ERROR';

export interface TradeVerdict {
  id: string;
  symbol: string;
  status: ConvictionLevel;
  direction: TradeDirection;
  probability: number;
  long_prob: number;
  short_prob: number;
  risk_level: string;
  entry_price: number;
  take_profit: number;
  stop_loss: number;
  leverage: number;
  margin_percent: number;
  risk_reward_ratio: number;
  timeframe: '15m' | '60m';
  message: string;
  timestamp: string;
  simulation_meta: {
    total_simulations: number;
    winning_paths: number;
    mode_target: number;
    floor_price: number;
  };
}

export interface WSMessage<T = unknown> {
  event: WSEventType;
  data: T;
  timestamp: string;
  sequence: number;
}

export interface SystemStatus {
  hub: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  brain: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  pulse: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  uptime_seconds: number;
  active_connections: number;
  last_simulation: string | null;
}

export interface PriceFeed {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  timestamp: string;
}
