<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — System Header
// Minimal top bar with status and time
// ============================================================

import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  hubStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  brainStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  wsConnected: boolean;
  isMuted: boolean;
}>();

const emit = defineEmits<{ toggleMute: [] }>();

const currentTime = ref('');
let timeInterval: ReturnType<typeof setInterval>;

function updateTime(): void {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

onMounted(() => { updateTime(); timeInterval = setInterval(updateTime, 1000); });
onUnmounted(() => clearInterval(timeInterval));
</script>

<template>
  <header class="header">
    <!-- Logo -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
        <svg class="h-4 w-4 text-[var(--color-neon-cyan)] mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 2.5L5 21.5" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M19 2.5L5 12L19 21.5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="19" cy="2.5" r="2.5" fill="currentColor" stroke="none"/>
          <circle cx="19" cy="21.5" r="2.5" fill="currentColor" stroke="none"/>
        </svg>
        <span class="text-[13px] font-semibold tracking-[0.15em] text-[var(--color-text-primary)]">KAIROS</span>
        <span class="text-[10px] font-medium text-[var(--color-text-muted)] tracking-[0.1em]">PRO</span>
      </div>
      <div class="header__sep"></div>
      <span class="text-[9px] text-[var(--color-text-muted)] tracking-[0.05em] font-medium">
        Execution Layer
      </span>
    </div>

    <!-- Right Side -->
    <div class="flex items-center gap-5">
      <!-- Status Nodes -->
      <div class="flex items-center gap-3 text-[10px]">
        <div class="header__node">
          <div :class="['status-dot', hubStatus === 'ONLINE' ? 'status-dot--online' : 'bg-[var(--color-neon-red)]']"></div>
          <span>Hub</span>
        </div>
        <div class="header__node">
          <div :class="['status-dot', brainStatus === 'ONLINE' ? 'status-dot--online' : 'bg-[var(--color-neon-red)]']"></div>
          <span>Brain</span>
        </div>
        <div class="header__node">
          <div :class="['status-dot', wsConnected ? 'status-dot--online' : 'bg-[var(--color-neon-red)]']"></div>
          <span>Pulse</span>
        </div>
      </div>

      <div class="header__sep"></div>

      <!-- Mute -->
      <button
        @click="emit('toggleMute')"
        class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
        :title="isMuted ? 'Unmute' : 'Mute'"
      >
        <svg v-if="!isMuted" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
      </button>

      <!-- Time -->
      <div class="font-mono text-[12px] text-[var(--color-text-secondary)] tabular-nums font-medium">
        {{ currentTime }}
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: rgba(12, 12, 18, 0.6);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
}

.header__sep {
  width: 1px;
  height: 14px;
  background: var(--color-border);
}

.header__node {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-weight: 500;
}
</style>
