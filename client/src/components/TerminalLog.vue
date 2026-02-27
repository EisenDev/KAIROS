<script setup lang="ts">
// ============================================================
// KAIROS PRO — Terminal Log
// Real-time system event log with terminal aesthetics
// ============================================================

import { ref, watch, nextTick } from 'vue';

interface LogEntry {
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SIGNAL';
  message: string;
}

const props = defineProps<{
  logs: LogEntry[];
}>();

const scrollContainer = ref<HTMLElement | null>(null);

watch(() => props.logs.length, async () => {
  await nextTick();
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
});

function levelColor(level: string): string {
  switch (level) {
    case 'INFO': return 'text-[var(--color-neon-cyan)]';
    case 'WARN': return 'text-[var(--color-neon-amber)]';
    case 'ERROR': return 'text-[var(--color-neon-red)]';
    case 'SIGNAL': return 'text-[var(--color-neon-green)]';
    default: return 'text-[var(--color-text-muted)]';
  }
}
</script>

<template>
  <div class="glass-panel p-4 h-full flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)] font-bold uppercase">
        System Log
      </h3>
      <div class="flex items-center gap-1.5">
        <div class="w-1.5 h-1.5 rounded-full bg-[var(--color-neon-green)] animate-pulse"></div>
        <span class="text-[9px] text-[var(--color-text-muted)]">LIVE</span>
      </div>
    </div>

    <div 
      ref="scrollContainer"
      class="flex-1 overflow-y-auto font-mono text-[11px] leading-5 space-y-0.5 pr-1"
    >
      <div
        v-for="(log, i) in logs"
        :key="i"
        class="flex gap-2 hover:bg-[rgba(0,240,255,0.02)] px-1 rounded"
      >
        <span class="text-[var(--color-text-muted)] tabular-nums shrink-0 select-none">
          {{ log.time }}
        </span>
        <span :class="['shrink-0 w-14 text-right', levelColor(log.level)]">
          [{{ log.level }}]
        </span>
        <span class="text-[var(--color-text-secondary)]">
          {{ log.message }}
        </span>
      </div>

      <div v-if="logs.length === 0" class="text-[var(--color-text-muted)] py-4">
        <span class="animate-[blink_1s_step-end_infinite]">█</span> Initializing system log...
      </div>
    </div>
  </div>
</template>
