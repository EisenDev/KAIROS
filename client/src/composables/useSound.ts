// ============================================================
// KAIROS PRO — useSound Composable
// Audio feedback system for trade signals
// ============================================================

import { ref } from 'vue';

type SoundType = 'execute' | 'caution' | 'alert' | 'connect' | 'disconnect';

interface UseSoundReturn {
  isMuted: ReturnType<typeof ref<boolean>>;
  play: (type: SoundType) => void;
  toggleMute: () => void;
}

// Audio context singleton
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Synthesize sounds programmatically — no external files needed.
 * Each sound type has a unique character that conveys urgency.
 */
function synthesizeSound(type: SoundType): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  switch (type) {
    case 'execute': {
      // High-frequency ascending "ping" — system ready, high conviction
      // Two rapid ascending tones: futuristic "power up"
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.2);
      gain2.gain.setValueAtTime(0.2, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.4);

      // Third harmonic ping
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1760, now + 0.15);
      osc3.frequency.exponentialRampToValueAtTime(3520, now + 0.25);
      gain3.gain.setValueAtTime(0.15, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc3.connect(gain3).connect(ctx.destination);
      osc3.start(now + 0.15);
      osc3.stop(now + 0.5);
      break;
    }

    case 'caution': {
      // Low pulse — radar style warning
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.2);
      osc.frequency.setValueAtTime(220, now + 0.4);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.setValueAtTime(0.08, now + 0.2);
      gain.gain.setValueAtTime(0.15, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }

    case 'alert': {
      // Sharp notification beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'connect': {
      // Gentle ascending chime — connection established
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }

    case 'disconnect': {
      // Descending tone — connection lost
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }
  }
}

export function useSound(): UseSoundReturn {
  const isMuted = ref(false);

  function play(type: SoundType): void {
    if (isMuted.value) return;

    try {
      synthesizeSound(type);
    } catch (err) {
      console.warn('🔇 Audio playback failed:', err);
    }
  }

  function toggleMute(): void {
    isMuted.value = !isMuted.value;
  }

  return {
    isMuted,
    play,
    toggleMute,
  };
}
