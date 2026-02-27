// ============================================================
// KAIROS PRO v3.5 — Sovereign Audio Layer
// Directional signals:
// • cyberLong  — Rising cyber-synth for LONG 70%+
// • warningShort — Descending warning tone for SHORT 70%+
// • gong — Analysis cycle starts
// • pulse — Interval heartbeat
// • alarm — Watcher emergency
// • success — >80% conviction
// ============================================================

import { ref } from 'vue';

export type TradeSound =
  | 'gong' | 'pulse' | 'alarm' | 'success'
  | 'cyberLong' | 'warningShort'
  | 'connect' | 'disconnect';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function synthesize(type: TradeSound): void {
  const ctx = getCtx();
  const now = ctx.currentTime;

  switch (type) {
    case 'pulse': {
      // Quick double-tap heartbeat
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now + i * 0.08);
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.05);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.05);
      }
      break;
    }

    case 'alarm': {
      // Emergency — aggressive descending siren
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(440, now + 0.15);
      osc1.frequency.setValueAtTime(880, now + 0.3);
      osc1.frequency.setValueAtTime(440, now + 0.45);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.7);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(80, now);
      osc2.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.4);
      break;
    }

    case 'success': {
      // Triumphant ascending chord (C5→E5→G5→C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i < 2 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12 - i * 0.02, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.45);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.45);
      });
      break;
    }

    case 'connect': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.25);
      break;
    }

    case 'disconnect': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.3);
      break;
    }

    case 'gong': {
      // Deep resonant bell — analysis cycle starts
      const fundamentals = [130.81, 196.00, 261.63]; // C3, G3, C4
      fundamentals.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.15 - i * 0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now); osc.stop(now + 1.4);
      });
      // Metallic shimmer
      const shimmer = ctx.createOscillator();
      const shimGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(1318.5, now);
      shimmer.frequency.exponentialRampToValueAtTime(659.25, now + 1.0);
      shimGain.gain.setValueAtTime(0.04, now);
      shimGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      shimmer.connect(shimGain).connect(ctx.destination);
      shimmer.start(now); shimmer.stop(now + 1.1);
      break;
    }

    // ─── SOVEREIGN SIGNALS ─────────────────────────────────

    case 'cyberLong': {
      // Rising cyber-synth — 70%+ LONG conviction
      // Ascending sine arpeggio + shimmering overtone + power bass
      const arpNotes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4→E4→G4→C5→E5
      arpNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i < 3 ? 'sine' : 'triangle';
        const t = now + i * 0.09;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + 0.15); // slight bend up
        gain.gain.setValueAtTime(0.12 - i * 0.015, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.35);
      });

      // Cyber shimmer — high-pitched ascending sweep
      const sweep = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweep.type = 'sawtooth';
      sweep.frequency.setValueAtTime(1046.5, now + 0.3);
      sweep.frequency.exponentialRampToValueAtTime(4186, now + 0.8);
      sweepGain.gain.setValueAtTime(0.03, now + 0.3);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      sweep.connect(sweepGain).connect(ctx.destination);
      sweep.start(now + 0.3); sweep.stop(now + 0.9);

      // Power bass anchor
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(65.41, now); // C2
      bassGain.gain.setValueAtTime(0.18, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      bass.connect(bassGain).connect(ctx.destination);
      bass.start(now); bass.stop(now + 0.7);
      break;
    }

    case 'warningShort': {
      // Descending warning tone — 70%+ SHORT conviction
      // Descending tritone + sub-bass + tension chord
      const descNotes = [659.25, 523.25, 392.00, 293.66, 220.00]; // E5→C5→G4→D4→A3
      descNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i < 2 ? 'sawtooth' : 'square';
        const t = now + i * 0.1;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.18); // bend down
        gain.gain.setValueAtTime(0.1 - i * 0.012, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.25);
      });

      // Sub-bass rumble
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(55, now); // A1
      sub.frequency.exponentialRampToValueAtTime(30, now + 0.6);
      subGain.gain.setValueAtTime(0.22, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      sub.connect(subGain).connect(ctx.destination);
      sub.start(now); sub.stop(now + 0.7);

      // Tension tritone (dissonant)
      const tritone = ctx.createOscillator();
      const triGain = ctx.createGain();
      tritone.type = 'triangle';
      tritone.frequency.setValueAtTime(466.16, now + 0.15); // Bb4
      tritone.frequency.exponentialRampToValueAtTime(329.63, now + 0.5); // E4 (tritone interval)
      triGain.gain.setValueAtTime(0.06, now + 0.15);
      triGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      tritone.connect(triGain).connect(ctx.destination);
      tritone.start(now + 0.15); tritone.stop(now + 0.6);
      break;
    }
  }
}

export function useTradeAudio() {
  const isMuted = ref(false);

  function play(type: TradeSound): void {
    if (isMuted.value) return;
    try { synthesize(type); } catch { /* ignore */ }
  }

  /** Convenience: play the right directional sound for a signal */
  function playSignal(conviction: number, direction: string): void {
    if (conviction >= 70) {
      if (direction === 'LONG') play('cyberLong');
      else if (direction === 'SHORT') play('warningShort');
    }
  }

  function toggleMute(): void {
    isMuted.value = !isMuted.value;
  }

  return { isMuted, play, playSignal, toggleMute };
}
