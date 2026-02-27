<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — S/R Level Guide
// Floating widget button that sits on the chart canvas
// ============================================================

import { ref } from 'vue';

const isOpen = ref(false);
</script>

<template>
  <div class="sr-widget">
    <!-- Toggle Button (near TV logo) -->
    <button
      @click="isOpen = !isOpen"
      class="sr-toggle"
      :class="{ 'sr-toggle--active': isOpen }"
    >
      <span class="sr-toggle__icon">📐</span>
      <span class="sr-toggle__label">S/R</span>
    </button>

    <!-- Expandable Panel -->
    <Transition name="sr-panel">
      <div v-if="isOpen" class="sr-panel">
        <div class="sr-panel__inner">
          <!-- Resistance -->
          <div class="sr-section">
            <div class="sr-section__title sr-section__title--red">Resistance</div>
            <div class="sr-row">
              <span class="sr-badge sr-badge--red">R1</span>
              <span>Nearest ceiling — first selling pressure zone</span>
            </div>
            <div class="sr-row">
              <span class="sr-badge sr-badge--red">R2</span>
              <span>Secondary barrier — break = bullish momentum</span>
            </div>
            <div class="sr-row">
              <span class="sr-badge sr-badge--red">R3</span>
              <span>Major resistance — historical high / breakout level</span>
            </div>
          </div>

          <div class="sr-divider"></div>

          <!-- Support -->
          <div class="sr-section">
            <div class="sr-section__title sr-section__title--green">Support</div>
            <div class="sr-row">
              <span class="sr-badge sr-badge--green">S1</span>
              <span>Nearest floor — first buying pressure zone</span>
            </div>
            <div class="sr-row">
              <span class="sr-badge sr-badge--green">S2</span>
              <span>Secondary floor — bounce = strong buy signal</span>
            </div>
            <div class="sr-row">
              <span class="sr-badge sr-badge--green">S3</span>
              <span>Major support — historical low / breakdown level</span>
            </div>
          </div>

          <div class="sr-divider"></div>

          <!-- How to read -->
          <div class="sr-section">
            <div class="sr-section__title sr-section__title--muted">How to read</div>
            <div class="sr-hint">Bounce off level = level holds. Break through = next level becomes target.</div>
            <div class="sr-hint">Green lines on chart = support. Red lines = resistance.</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.sr-widget {
  position: relative;
  z-index: 15;
}

.sr-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(16, 16, 24, 0.85);
  backdrop-filter: blur(12px);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-sans);
}

.sr-toggle:hover,
.sr-toggle--active {
  border-color: rgba(56, 189, 248, 0.2);
  background: rgba(56, 189, 248, 0.06);
}

.sr-toggle__icon {
  font-size: 10px;
}

.sr-toggle__label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.sr-toggle--active .sr-toggle__label {
  color: var(--color-neon-cyan);
}

/* Panel */
.sr-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 280px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(12, 12, 18, 0.95);
  backdrop-filter: blur(24px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.sr-panel__inner {
  padding: 12px;
}

.sr-section {
  margin-bottom: 2px;
}

.sr-section__title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 6px;
  font-family: var(--font-sans);
}

.sr-section__title--red { color: var(--color-neon-red); }
.sr-section__title--green { color: var(--color-neon-green); }
.sr-section__title--muted { color: var(--color-text-muted); }

.sr-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 10px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 4px;
  font-family: var(--font-sans);
}

.sr-badge {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 700;
  font-family: var(--font-mono);
  padding: 1px 5px;
  border-radius: 3px;
  margin-top: 1px;
}

.sr-badge--red {
  color: var(--color-neon-red);
  background: rgba(248, 113, 113, 0.1);
}

.sr-badge--green {
  color: var(--color-neon-green);
  background: rgba(52, 211, 153, 0.1);
}

.sr-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.06);
  margin: 8px 0;
}

.sr-hint {
  font-size: 9px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: 2px;
  font-family: var(--font-sans);
}

/* Transition */
.sr-panel-enter-active,
.sr-panel-leave-active {
  transition: all 0.2s ease;
}
.sr-panel-enter-from,
.sr-panel-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
