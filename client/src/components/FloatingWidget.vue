<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — Floating Widget
// Draggable card with minimalist design
// ============================================================

import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  title: string;
  icon?: string;
  initialX?: number;
  initialY?: number;
  width?: string;
  height?: string;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const x = ref(props.initialX ?? 100);
const y = ref(props.initialY ?? 100);
const isDragging = ref(false);
let dragOffsetX = 0;
let dragOffsetY = 0;

function onMouseDown(e: MouseEvent): void {
  isDragging.value = true;
  dragOffsetX = e.clientX - x.value;
  dragOffsetY = e.clientY - y.value;
  e.preventDefault();
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging.value) return;
  x.value = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffsetX));
  y.value = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffsetY));
}

function onMouseUp(): void {
  isDragging.value = false;
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
  <div
    class="widget"
    :style="{
      left: x + 'px',
      top: y + 'px',
      width: width || '380px',
      height: height || 'auto',
    }"
  >
    <!-- Drag Handle -->
    <div @mousedown="onMouseDown" class="widget__header">
      <div class="flex items-center gap-2">
        <span v-if="icon" class="text-[11px]">{{ icon }}</span>
        <span class="widget__title">{{ title }}</span>
      </div>
      <button @click="emit('close')" class="widget__close">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Content -->
    <div class="widget__body" :style="{ maxHeight: height ? 'calc(' + height + ' - 36px)' : '460px' }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.widget {
  position: fixed;
  z-index: 50;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(12, 12, 18, 0.92);
  backdrop-filter: blur(24px);
  border: 1px solid var(--color-border);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(148, 163, 184, 0.05);
}

.widget__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: grab;
  user-select: none;
  border-bottom: 1px solid var(--color-border);
  background: rgba(148, 163, 184, 0.02);
}

.widget__header:active {
  cursor: grabbing;
}

.widget__title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
}

.widget__close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.widget__close:hover {
  color: var(--color-neon-red);
  background: rgba(248, 113, 113, 0.08);
}

.widget__body {
  padding: 12px;
  overflow-y: auto;
}
</style>
