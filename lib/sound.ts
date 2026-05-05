/**
 * Loud, attention-grabbing notification sound using the Web Audio API.
 *
 * Browsers block audio until a user gesture happens. We work around this by:
 *   1. Listening for the FIRST user interaction (pointer/key/touch) and
 *      resuming/warming the AudioContext immediately ("unlocking").
 *   2. Awaiting `ctx.resume()` inside `playNotificationSound` as a fallback.
 *
 * The sound is a 3-beep alarm pattern (high → low → high) with a square +
 * sine mix at near-max gain so it cuts through any environment.
 */

const STORAGE_KEY = "tf:notif-sound-muted";

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setNotificationSoundMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  if (muted) window.localStorage.setItem(STORAGE_KEY, "1");
  else window.localStorage.removeItem(STORAGE_KEY);
}

let cachedCtx: AudioContext | null = null;
let unlocked = false;
let unlockBound = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedCtx) return cachedCtx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
}

/** Unlock the AudioContext on the first user gesture (browser autoplay policy). */
export function bindAudioUnlock() {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const handler = async () => {
    const ctx = getContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      // Play a silent buffer to fully unlock on iOS/Safari
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      unlocked = true;
    } catch {
      /* ignore */
    } finally {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    }
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
}

/** Play one beep at the given frequency, starting at startAt seconds. */
function playBeep(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration = 0.18,
  volume = 0.85,
) {
  // Mix square (cuts through) + sine (warmer body)
  const square = ctx.createOscillator();
  const sine = ctx.createOscillator();
  const squareGain = ctx.createGain();
  const sineGain = ctx.createGain();
  const masterGain = ctx.createGain();

  square.type = "square";
  square.frequency.value = freq;
  sine.type = "sine";
  sine.frequency.value = freq;

  squareGain.gain.value = 0.35;
  sineGain.gain.value = 0.65;

  // ADSR-like envelope: quick attack, short hold, fast decay (no clicks).
  masterGain.gain.setValueAtTime(0, startAt);
  masterGain.gain.linearRampToValueAtTime(volume, startAt + 0.008);
  masterGain.gain.linearRampToValueAtTime(volume, startAt + duration - 0.04);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  square.connect(squareGain).connect(masterGain);
  sine.connect(sineGain).connect(masterGain);
  masterGain.connect(ctx.destination);

  square.start(startAt);
  sine.start(startAt);
  square.stop(startAt + duration + 0.02);
  sine.stop(startAt + duration + 0.02);
}

export async function playNotificationSound(opts: { force?: boolean } = {}) {
  if (!opts.force && isNotificationSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  } catch {
    /* ignore */
  }
  const now = ctx.currentTime;
  // 3-beep alarm pattern: high → low → high. Loud and unmistakable.
  // Tones tuned to be attention-grabbing without being painful.
  playBeep(ctx, 1175, now + 0.0,  0.16, 0.9);  // D6 (high)
  playBeep(ctx, 880,  now + 0.20, 0.16, 0.9);  // A5 (mid)
  playBeep(ctx, 1175, now + 0.40, 0.20, 0.95); // D6 (high, longer)
}

/** Quick single-beep used as a UI confirmation when toggling settings. */
export async function playPreviewSound() {
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    /* ignore */
  }
  const now = ctx.currentTime;
  playBeep(ctx, 1175, now, 0.18, 0.85);
}

export { unlocked };
