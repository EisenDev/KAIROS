<script setup lang="ts">
// ============================================================
// KAIROS PRO v3.5 — Intelligence Terminal
// Journalist findings rendered with Markdown (marked)
// Watcher real-time alerts with severity indicators
// ============================================================

import { computed } from 'vue';
import { marked } from 'marked';

interface Finding {
  headline: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

interface JournalistData {
  sentiment: string;
  sentiment_score: number;
  findings: Finding[];
  narrative: string;
  key_factors: string[];
  market_mood: string;
  timestamp: string;
}

interface WatcherAlert {
  id: string;
  type: 'EMERGENCY' | 'WARNING' | 'INFO';
  trigger: string;
  headline: string;
  description: string;
  impact_score: number;
  timestamp: string;
}

const props = defineProps<{
  journalist: JournalistData | null;
  alerts: WatcherAlert[];
}>();

const emergencyAlerts = computed(() => props.alerts.filter(a => a.type === 'EMERGENCY'));
const warningAlerts = computed(() => props.alerts.filter(a => a.type === 'WARNING'));
const infoAlerts = computed(() => props.alerts.filter(a => a.type === 'INFO'));

// Render narrative as markdown
const renderedNarrative = computed(() => {
  if (!props.journalist?.narrative) return '';
  return marked.parse(props.journalist.narrative, { async: false }) as string;
});

// Render key_levels_analysis or market_mood as markdown
const renderedMood = computed(() => {
  if (!props.journalist?.market_mood) return '';
  return marked.parse(props.journalist.market_mood, { async: false }) as string;
});

function impactColor(impact: string): string {
  if (impact === 'HIGH') return 'text-[var(--color-neon-red)]';
  if (impact === 'MEDIUM') return 'text-[var(--color-neon-amber)]';
  return 'text-[var(--color-text-muted)]';
}

function sentimentDot(s: string): string {
  if (s === 'POSITIVE' || s === 'BULLISH') return 'bg-[var(--color-neon-green)]';
  if (s === 'NEGATIVE' || s === 'BEARISH') return 'bg-[var(--color-neon-red)]';
  return 'bg-[var(--color-text-muted)]';
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const sentimentBar = computed(() => {
  if (!props.journalist) return { width: '50%', color: 'var(--color-hold)' };
  const score = props.journalist.sentiment_score;
  const width = `${50 + score / 2}%`;
  const color = score > 20 ? 'var(--color-neon-green)' : score < -20 ? 'var(--color-neon-red)' : 'var(--color-neon-amber)';
  return { width, color };
});
</script>

<template>
  <div class="glass-panel h-full flex flex-col overflow-hidden" style="padding: 14px 16px;">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 shrink-0">
      <div class="flex items-center gap-2">
        <h3 class="text-[10px] font-semibold tracking-[0.06em] text-[var(--color-text-secondary)] uppercase">
          Intelligence Terminal
        </h3>
      </div>
      <div v-if="emergencyAlerts.length > 0" class="flex items-center gap-1.5">
        <div class="status-dot bg-[var(--color-neon-red)] status-dot--pulse"></div>
        <span class="text-[9px] text-[var(--color-neon-red)] font-semibold">{{ emergencyAlerts.length }} Emergency</span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
      <!-- Emergency Alerts -->
      <div v-for="alert in emergencyAlerts" :key="alert.id"
        class="rounded-lg p-3 animate-fade-in"
        style="background: rgba(248, 113, 113, 0.06); border: 1px solid rgba(248, 113, 113, 0.15);">
        <div class="flex items-center gap-2 mb-1">
          <div class="status-dot bg-[var(--color-neon-red)]"></div>
          <span class="text-[10px] font-semibold text-[var(--color-neon-red)]">Emergency</span>
          <span class="text-[9px] text-[var(--color-text-muted)] ml-auto font-mono tabular-nums">{{ formatTime(alert.timestamp) }}</span>
        </div>
        <div class="text-[11px] text-[var(--color-text-primary)] font-medium">{{ alert.headline }}</div>
        <div class="text-[10px] text-[var(--color-text-secondary)] mt-1">{{ alert.description }}</div>
      </div>

      <!-- Sentiment Overview -->
      <div v-if="journalist" class="space-y-3">
        <!-- Sentiment Bar -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="label">Sentiment</span>
            <span :class="['text-[11px] font-semibold', journalist.sentiment === 'BULLISH' ? 'text-[var(--color-neon-green)]' : journalist.sentiment === 'BEARISH' ? 'text-[var(--color-neon-red)]' : 'text-[var(--color-text-muted)]']">
              {{ journalist.sentiment }} <span class="font-mono text-[10px] opacity-60">({{ journalist.sentiment_score > 0 ? '+' : '' }}{{ journalist.sentiment_score }})</span>
            </span>
          </div>
          <div class="w-full h-[3px] bg-[rgba(0,0,0,0.3)] rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
              :style="{ width: sentimentBar.width, background: sentimentBar.color }"></div>
          </div>
        </div>

        <!-- AI Narrative (rendered as Markdown) -->
        <div v-if="journalist.narrative"
          class="prose-container rounded-lg"
          style="background: rgba(0,0,0,0.15); padding: 10px 12px;">
          <div class="prose-content" v-html="renderedNarrative"></div>
        </div>

        <!-- Market Mood (markdown) -->
        <div v-if="journalist.market_mood && !journalist.narrative"
          class="prose-container rounded-lg"
          style="background: rgba(56, 189, 248, 0.03); padding: 8px 12px;">
          <div class="prose-content" v-html="renderedMood"></div>
        </div>

        <!-- Findings -->
        <div class="space-y-1">
          <div class="label mb-1">Findings</div>
          <div v-for="(finding, i) in journalist.findings" :key="i"
            class="flex items-start gap-2 py-1.5 px-2.5 rounded-md text-[11px]"
            style="background: rgba(0,0,0,0.15);">
            <div :class="['w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', sentimentDot(finding.sentiment)]"></div>
            <div class="flex-1 min-w-0">
              <div class="text-[var(--color-text-secondary)] leading-relaxed">{{ finding.headline }}</div>
            </div>
            <span :class="['text-[9px] font-semibold shrink-0 font-mono', impactColor(finding.impact)]">
              {{ finding.impact }}
            </span>
          </div>
        </div>

        <!-- Key Factors -->
        <div v-if="journalist.key_factors?.length">
          <div class="label mb-1.5">Key Factors</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="factor in journalist.key_factors" :key="factor"
              class="text-[9px] px-2 py-0.5 rounded-md text-[var(--color-text-secondary)] font-medium"
              style="background: rgba(148, 163, 184, 0.06); border: 1px solid rgba(148, 163, 184, 0.08);">
              {{ factor }}
            </span>
          </div>
        </div>
      </div>

      <!-- Warning + Info Alerts -->
      <div v-for="alert in [...warningAlerts, ...infoAlerts].slice(0, 5)" :key="alert.id"
        class="flex items-start gap-2 py-1.5 px-2.5 rounded-md text-[11px]"
        style="background: rgba(0,0,0,0.1);">
        <div :class="['w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', alert.type === 'WARNING' ? 'bg-[var(--color-neon-amber)]' : 'bg-[var(--color-text-muted)]']"></div>
        <div class="flex-1 min-w-0">
          <div class="text-[var(--color-text-secondary)]">{{ alert.headline }}</div>
        </div>
        <span class="text-[9px] text-[var(--color-text-muted)] font-mono tabular-nums shrink-0">{{ formatTime(alert.timestamp) }}</span>
      </div>

      <!-- Empty state -->
      <div v-if="!journalist && alerts.length === 0" class="flex-1 flex items-center justify-center py-8">
        <div class="text-center text-[var(--color-text-muted)]">
          <div class="text-[11px] font-medium">Awaiting intelligence</div>
          <div class="text-[9px] mt-1">Run committee to populate</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Markdown prose styling — minimal dark theme */
.prose-container {
  font-family: var(--font-sans);
}

.prose-content {
  font-size: 11px;
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.prose-content :deep(p) {
  margin-bottom: 8px;
}

.prose-content :deep(p:last-child) {
  margin-bottom: 0;
}

.prose-content :deep(strong) {
  color: var(--color-text-primary);
  font-weight: 600;
}

.prose-content :deep(em) {
  color: var(--color-neon-cyan);
  font-style: italic;
}

.prose-content :deep(ul),
.prose-content :deep(ol) {
  padding-left: 16px;
  margin-bottom: 8px;
}

.prose-content :deep(li) {
  margin-bottom: 3px;
}

.prose-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--color-neon-cyan);
}

.prose-content :deep(blockquote) {
  border-left: 2px solid rgba(56, 189, 248, 0.2);
  padding-left: 10px;
  margin: 8px 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.prose-content :deep(h1),
.prose-content :deep(h2),
.prose-content :deep(h3) {
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 6px;
  margin-top: 12px;
  font-size: 12px;
}

.prose-content :deep(a) {
  color: var(--color-neon-cyan);
  text-decoration: none;
}

.prose-content :deep(a:hover) {
  text-decoration: underline;
}
</style>
