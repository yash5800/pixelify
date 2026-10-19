/**
 * Notification and Audio Sound utilities for Pixelify Upscaler.
 * Uses the Web Audio API for zero-dependency, zero-latency sound synthesis
 * and the Web Notifications API for background desktop alerts.
 */

const SOUND_PREF_KEY = 'pixelify_sound_enabled';

let audioCtx: AudioContext | null = null;

/**
 * Get or initialize the singleton AudioContext.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Prime audio context on user gestures (e.g. clicking the Upscale button)
 * to satisfy modern browser autoplay policies.
 */
export function primeAudio(): void {
  getAudioContext();
}

/**
 * Check whether sound effects are enabled (default: true).
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(SOUND_PREF_KEY);
  return val === null ? true : val === 'true';
}

/**
 * Set sound effects preference.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}

/**
 * Synthesize an elegant, futuristic two-tone completion chime.
 * Note progression: D5 (587 Hz) gliding to E5 -> A5 (880 Hz) with soft harmonic overtone.
 */
export function playSuccessChime(): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // --- TONE 1: Warm Foundation (D5 -> E5, 587.33 Hz) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.025);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // --- TONE 2: Bright Resolution Chime (A5, 880 Hz) ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);

    gain2.gain.setValueAtTime(0.0001, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.16, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.66);

    // --- TONE 3: High-frequency crystalline shimmer (E6, 1318.5 Hz) ---
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1318.51, now + 0.12);

    gain3.gain.setValueAtTime(0.0001, now + 0.12);
    gain3.gain.linearRampToValueAtTime(0.04, now + 0.14);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.12);
    osc3.stop(now + 0.51);
  } catch (err) {
    console.warn('Could not play upscale success chime:', err);
  }
}

/**
 * Request notification permission from the browser.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Send a native browser desktop notification if permitted.
 */
export function sendDesktopNotification(
  title: string,
  body: string,
  iconUrl?: string
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: iconUrl || '/favicon.ico',
        badge: '/image-circle.svg',
        silent: true, // We already play our synthesized Web Audio chime
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.warn('Failed to send desktop notification:', err);
    }
  }
}
