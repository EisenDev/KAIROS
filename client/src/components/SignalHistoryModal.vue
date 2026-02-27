<script setup lang="ts">
// ============================================================
// Signal History Modal (Draggable)
// ============================================================

import { ref } from 'vue';

const props = defineProps<{
  signals: any[];
}>();

const emit = defineEmits<{ close: [] }>();

// Draggable state

const headerRef = ref<HTMLElement | null>(null);
const pos = ref({ x: 100, y: 100 });
let isDragging = false;
let startX = 0, startY = 0;

function onPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') return;
  isDragging = true;
  startX = e.clientX - pos.value.x;
  startY = e.clientY - pos.value.y;
  headerRef.value?.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging) return;
  pos.value.x = e.clientX - startX;
  pos.value.y = e.clientY - startY;
}

function onPointerUp(e: PointerEvent) {
  isDragging = false;
  headerRef.value?.releasePointerCapture(e.pointerId);
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function formatDateMonth(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRiskColor(risk: string) {
  if (!risk) return 'var(--color-text-muted)';
  if (risk.includes('LOW')) return 'var(--color-neon-green)';
  if (risk.includes('MEDIUM')) return 'var(--color-neon-amber)';
  if (risk.includes('HIGH')) return 'var(--color-neon-red)';
  return 'var(--color-text-muted)';
}
</script>

<template>
  <div
    class="fixed z-50 glass-panel overflow-hidden shadow-2xl flex flex-col"
    :style="{ left: pos.x + 'px', top: pos.y + 'px', width: '400px', maxHeight: '500px' }"
  >
    <!-- Draggable Header -->
    <div
      ref="headerRef"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      class="flex items-center justify-between p-3 border-b border-[var(--color-border)] cursor-move select-none"
      style="background: rgba(0,0,0,0.2)"
    >
      <div class="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] text-[var(--color-text-secondary)] uppercase">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Signal Intelligence History
      </div>
      <button @click="emit('close')" class="text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Table Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 relative">
      <div v-if="signals.length === 0" class="text-center py-8 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
        No signal intelligence available
      </div>

      <table v-else class="w-full text-[10px] tabular-nums">
        <thead class="text-[9px] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
          <tr>
            <th class="pb-2 text-left font-medium">Date</th>
            <th class="pb-2 text-left font-medium">Time</th>
            <th class="pb-2 text-left font-medium">Risk Intelligence</th>
            <th class="pb-2 text-center font-medium">L</th>
            <th class="pb-2 text-center font-medium">S</th>
            <th class="pb-2 text-center font-medium">H</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sig in [...signals].reverse()" :key="sig.id" class="border-b border-[rgba(255,255,255,0.02)]">
            <td class="py-2.5 text-[var(--color-text-secondary)]">{{ formatDateMonth(sig.timestamp) }}</td>
            <td class="py-2.5 text-[var(--color-text-primary)] opacity-80">{{ formatTime(sig.timestamp) }}</td>
            <td class="py-2.5">
              <span :style="{ color: getRiskColor(sig.risk_level) }" class="font-semibold tracking-[0.05em]">
                {{ Math.max(sig.long_prob || 50, sig.short_prob || 50).toFixed(0) }}% {{ sig.risk_level?.split(' ')[0] || 'NEUTRAL' }}
              </span>
            </td>
            <!-- Checkboxes -->
            <!-- Checkboxes -->
            <td class="py-2.5 text-center">
              <div 
                v-if="(sig.long_prob || 0) > (sig.short_prob || 0)" 
                class="w-3 h-3 mx-auto rounded-sm border flex items-center justify-center opacity-90"
                :style="{ backgroundColor: getRiskColor(sig.risk_level), borderColor: getRiskColor(sig.risk_level) }"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div v-else class="w-3 h-3 mx-auto rounded-sm border border-[rgba(255,255,255,0.1)]"></div>
            </td>
            <td class="py-2.5 text-center">
              <div 
                v-if="(sig.short_prob || 0) > (sig.long_prob || 0)" 
                class="w-3 h-3 mx-auto rounded-sm border flex items-center justify-center opacity-90"
                :style="{ backgroundColor: getRiskColor(sig.risk_level), borderColor: getRiskColor(sig.risk_level) }"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div v-else class="w-3 h-3 mx-auto rounded-sm border border-[rgba(255,255,255,0.1)]"></div>
            </td>
            <td class="py-2.5 text-center">
              <div 
                v-if="sig.direction === 'HOLD'" 
                class="w-3 h-3 mx-auto rounded-sm border flex items-center justify-center"
                style="background-color: var(--color-text-muted); border-color: var(--color-text-muted);"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div v-else class="w-3 h-3 mx-auto rounded-sm border border-[rgba(255,255,255,0.1)]"></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend Footer -->
    <div class="px-3 py-2 border-t border-[var(--color-border)] flex items-center justify-between text-[8px] tracking-[0.05em] uppercase font-mono bg-[rgba(0,0,0,0.2)]">
      <span class="text-[var(--color-neon-green)] flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-current"></div> GREEN (80-100%)</span>
      <span class="text-[var(--color-neon-amber)] flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-current"></div> YEL (70-79%)</span>
      <span class="text-[var(--color-neon-red)] flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-current"></div> RED (60-69%)</span>
      <span class="text-[var(--color-text-muted)] flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-current"></div> GRY (50-59% HOLD)</span>
    </div>
  </div>
</template>
