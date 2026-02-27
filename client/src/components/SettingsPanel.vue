<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — Settings Panel
// Bottom-right gear with widget toggles
// ============================================================

import { ref, reactive } from 'vue';

const isOpen = ref(false);
const liveNewsUrl = ref('');
const liveNewsInput = ref('');

const widgets = reactive({
  liveNews: false,
  latestNews: false,
  tradeLog: false,
  miniChart: false,
});

const emit = defineEmits<{
  (e: 'toggle-widget', widget: string, active: boolean, url?: string): void;
}>();

function toggleWidget(key: keyof typeof widgets): void {
  widgets[key] = !widgets[key];
  const url = key === 'liveNews' ? liveNewsUrl.value : undefined;
  emit('toggle-widget', key, widgets[key], url);
}

function setLiveNewsUrl(): void {
  if (!liveNewsInput.value.trim()) return;
  liveNewsUrl.value = liveNewsInput.value.trim();
  if (!widgets.liveNews) widgets.liveNews = true;
  emit('toggle-widget', 'liveNews', true, liveNewsUrl.value);
  liveNewsInput.value = '';
}

function closeWidget(key: keyof typeof widgets): void {
  widgets[key] = false;
  emit('toggle-widget', key, false);
}

defineExpose({ closeWidget });
</script>

<template>
  <div class="fixed bottom-5 right-5 z-40">
    <!-- Gear Button -->
    <button @click="isOpen = !isOpen" class="gear-btn" :class="{ 'gear-btn--active': isOpen }">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>

    <!-- Panel -->
    <Transition name="slide-up">
      <div v-if="isOpen" class="settings-panel">
        <div class="settings-panel__header">
          <span class="settings-panel__title">Widgets</span>
          <span class="text-[8px] text-[var(--color-text-muted)]">Drag anywhere</span>
        </div>

        <div class="settings-panel__body">
          <!-- Live News -->
          <div class="space-y-1.5">
            <label class="widget-option">
              <input type="checkbox" :checked="widgets.liveNews" @change="toggleWidget('liveNews')" class="widget-checkbox" />
              <div>
                <div class="widget-option__label">📺 Live News Stream</div>
                <div class="widget-option__desc">Embed a live video/stream</div>
              </div>
            </label>
            <div class="flex gap-1.5 pl-5">
              <input
                v-model="liveNewsInput"
                type="text"
                placeholder="Paste video URL…"
                @keydown.enter="setLiveNewsUrl"
                class="url-input"
              />
              <button @click="setLiveNewsUrl" class="url-btn">Set</button>
            </div>
            <div v-if="liveNewsUrl" class="pl-5 text-[8px] text-[var(--color-text-muted)] truncate">{{ liveNewsUrl }}</div>
          </div>

          <div class="settings-sep"></div>

          <label class="widget-option">
            <input type="checkbox" :checked="widgets.latestNews" @change="toggleWidget('latestNews')" class="widget-checkbox" />
            <div>
              <div class="widget-option__label">📰 Latest News</div>
              <div class="widget-option__desc">Journalist findings</div>
            </div>
          </label>

          <label class="widget-option">
            <input type="checkbox" :checked="widgets.tradeLog" @change="toggleWidget('tradeLog')" class="widget-checkbox" />
            <div>
              <div class="widget-option__label">📋 Trade Log</div>
              <div class="widget-option__desc">Signal history</div>
            </div>
          </label>

          <label class="widget-option">
            <input type="checkbox" :checked="widgets.miniChart" @change="toggleWidget('miniChart')" class="widget-checkbox" />
            <div>
              <div class="widget-option__label">📊 Probability Chart</div>
              <div class="widget-option__desc">Win rate over time</div>
            </div>
          </label>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.gear-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  background: rgba(12, 12, 18, 0.8);
  backdrop-filter: blur(12px);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.gear-btn:hover {
  color: var(--color-text-secondary);
  border-color: var(--color-border-hover);
}

.gear-btn--active {
  color: var(--color-neon-cyan);
  border-color: var(--color-border-accent);
  transform: rotate(45deg);
}

.settings-panel {
  position: absolute;
  bottom: 46px;
  right: 0;
  width: 280px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: rgba(12, 12, 18, 0.95);
  backdrop-filter: blur(24px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.settings-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
}

.settings-panel__title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
}

.settings-panel__body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.widget-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
}

.widget-checkbox {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  accent-color: var(--color-neon-cyan);
  margin-top: 1px;
}

.widget-option__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}

.widget-option__desc {
  font-size: 9px;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
}

.settings-sep {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

.url-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 10px;
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.15s ease;
}

.url-input::placeholder {
  color: var(--color-text-muted);
}

.url-input:focus {
  border-color: var(--color-border-accent);
}

.url-btn {
  padding: 4px 10px;
  font-size: 9px;
  font-weight: 600;
  font-family: var(--font-sans);
  border-radius: 5px;
  border: 1px solid var(--color-border);
  background: rgba(56, 189, 248, 0.06);
  color: var(--color-neon-cyan);
  cursor: pointer;
  transition: all 0.15s ease;
}

.url-btn:hover {
  background: rgba(56, 189, 248, 0.12);
  border-color: var(--color-border-accent);
}

/* Animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
