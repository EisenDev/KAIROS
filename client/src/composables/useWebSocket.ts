// ============================================================
// KAIROS PRO — useWebSocket Composable
// Real-time WebSocket connection to The Hub
// ============================================================

import { ref, onUnmounted, type Ref } from 'vue';
import type { WSMessage, WSEventType } from '../types';

interface UseWebSocketOptions {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: Ref<boolean>;
  lastMessage: Ref<WSMessage | null>;
  reconnectCount: Ref<number>;
  send: (data: unknown) => void;
  onEvent: (event: WSEventType, callback: (data: any) => void) => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = `ws://${window.location.host}/ws`,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const isConnected = ref(false);
  const lastMessage = ref<WSMessage | null>(null);
  const reconnectCount = ref(0);
  
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const eventHandlers = new Map<WSEventType, Set<(data: any) => void>>();

  function connect(): void {
    if (ws?.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('🔗 [KAIROS] WebSocket connected');
        isConnected.value = true;
        reconnectCount.value = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          lastMessage.value = msg;

          // Dispatch to registered handlers
          const handlers = eventHandlers.get(msg.event);
          if (handlers) {
            handlers.forEach(cb => cb(msg.data));
          }
        } catch (err) {
          console.error('❌ [KAIROS] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('🔌 [KAIROS] WebSocket disconnected');
        isConnected.value = false;

        if (autoReconnect && reconnectCount.value < maxReconnectAttempts) {
          reconnectTimer = setTimeout(() => {
            reconnectCount.value++;
            console.log(`🔄 [KAIROS] Reconnecting... (${reconnectCount.value}/${maxReconnectAttempts})`);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (err) => {
        console.error('❌ [KAIROS] WebSocket error:', err);
      };
    } catch (err) {
      console.error('❌ [KAIROS] Connection failed:', err);
    }
  }

  function send(data: unknown): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function onEvent(event: WSEventType, callback: (data: any) => void): void {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set());
    }
    eventHandlers.get(event)!.add(callback);
  }

  function disconnect(): void {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
    ws = null;
    isConnected.value = false;
  }

  // Auto-connect
  connect();

  // Cleanup
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    lastMessage,
    reconnectCount,
    send,
    onEvent,
    disconnect,
  };
}
