// ============================================================
// KAIROS PRO — WebSocket Manager
// Manages all WebSocket connections and broadcasts
// ============================================================

import type { WSContext } from 'hono/ws';
import type { WSMessage, WSEventType, TradeVerdict, SystemStatus, PriceFeed } from './types.js';

interface ConnectedClient {
  ws: WSContext;
  id: string;
  connectedAt: Date;
  lastPing: Date;
}

class WebSocketManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private sequence = 0;

  /**
   * Register a new client connection
   */
  addClient(ws: WSContext): string {
    const id = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.clients.set(id, {
      ws,
      id,
      connectedAt: new Date(),
      lastPing: new Date(),
    });

    console.log(`🔗 [WS] Client connected: ${id} | Total: ${this.clients.size}`);

    // Send welcome message
    this.sendTo(id, 'SYSTEM_STATUS', {
      message: 'Connected to KAIROS PRO Command Center',
      clientId: id,
    });

    return id;
  }

  /**
   * Remove a client connection
   */
  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`🔌 [WS] Client disconnected: ${id} | Total: ${this.clients.size}`);
  }

  /**
   * Find client ID by WSContext reference
   */
  findClientId(ws: WSContext): string | undefined {
    for (const [id, client] of this.clients) {
      if (client.ws === ws) return id;
    }
    return undefined;
  }

  /**
   * Send message to a specific client
   */
  sendTo<T>(clientId: string, event: WSEventType, data: T): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const message: WSMessage<T> = {
      event,
      data,
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence,
    };

    try {
      client.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error(`❌ [WS] Failed to send to ${clientId}:`, err);
      this.removeClient(clientId);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast<T>(event: WSEventType, data: T): void {
    const message: WSMessage<T> = {
      event,
      data,
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence,
    };

    const payload = JSON.stringify(message);
    let delivered = 0;

    for (const [id, client] of this.clients) {
      try {
        client.ws.send(payload);
        delivered++;
      } catch (err) {
        console.error(`❌ [WS] Broadcast failed for ${id}:`, err);
        this.removeClient(id);
      }
    }

    if (event !== 'HEARTBEAT') {
      console.log(`📡 [WS] Broadcast ${event} → ${delivered}/${this.clients.size} clients`);
    }
  }

  /**
   * Broadcast a trade alert (high conviction signal)
   */
  broadcastTradeAlert(verdict: TradeVerdict): void {
    this.broadcast('TRADE_ALERT', verdict);
  }

  /**
   * Broadcast a signal update (any conviction level)
   */
  broadcastSignalUpdate(verdict: TradeVerdict): void {
    this.broadcast('SIGNAL_UPDATE', verdict);
  }

  /**
   * Broadcast system status
   */
  broadcastSystemStatus(status: SystemStatus): void {
    this.broadcast('SYSTEM_STATUS', status);
  }

  /**
   * Broadcast price feed
   */
  broadcastPriceFeed(feed: PriceFeed): void {
    this.broadcast('PRICE_FEED', feed);
  }

  /**
   * Get active connection count
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Start heartbeat interval
   */
  startHeartbeat(intervalMs: number = 15000): void {
    setInterval(() => {
      this.broadcast('HEARTBEAT', {
        timestamp: new Date().toISOString(),
        connections: this.clients.size,
      });
    }, intervalMs);
  }
}

// Singleton
export const wsManager = new WebSocketManager();
