/**
 * Plays a short, pleasant two-tone "ding" notification sound using the
 * Web Audio API. No audio file required.
 *
 * Uses a quick exponential decay envelope on a sine wave so it doesn't
 * click. Two notes (E5 → A5) make it feel positive and chime-like.
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

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedCtx) return cachedCtx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
}

function playTone(ctx: AudioContext, freq: number, startAt: number, duration = 0.18) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // Volume envelope: quick attack, exponential decay
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

export function playNotificationSound(opts: { force?: boolean } = {}) {
  if (!opts.force && isNotificationSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  // Some browsers suspend AudioContext until a user gesture.
  // If suspended, try resume but don't await — sound may simply not play
  // until the user interacts with the page.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  // Two-tone chime: E5 then A5
  playTone(ctx, 659.25, now);            // E5
  playTone(ctx, 880.0, now + 0.13);      // A5
}
