// Velvet Vault — tiny WebAudio synth. No audio files, no network: every
// sound is an oscillator blip shaped in code. The context is created on
// the first player gesture, so browsers never autoplay anything.

let context = null;
let muted = false;

/** Create (or reuse) the audio context. Call from a user gesture. */
export function ensureAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return context;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  } catch {
    context = null;
  }
  return context;
}

/** Toggle sound on and off; returns the new muted state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function blip(freq, duration, type, volume, slideTo) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Sound is garnish; a failed blip never stops the game.
  }
}

export function soundStep(sneaking) {
  // Sneak steps are lower and quieter than walking steps.
  blip(sneaking ? 140 : 190, 0.07, 'triangle', sneaking ? 0.015 : 0.03);
}

export function soundCoin() {
  blip(1200, 0.12, 'sine', 0.1, 700);
  blip(1800, 0.1, 'sine', 0.06, 1200);
}

export function soundLoot() {
  blip(660, 0.12, 'sine', 0.12);
  setTimeout(() => blip(990, 0.16, 'sine', 0.12), 90);
}

export function soundAlarm() {
  blip(520, 0.22, 'square', 0.05, 760);
}

export function soundCaught() {
  blip(220, 0.5, 'sawtooth', 0.12, 60);
}

export function soundWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => blip(freq, 0.22, 'sine', 0.12), i * 110);
  });
}

export function soundDoor() {
  blip(300, 0.3, 'triangle', 0.08, 520);
}
