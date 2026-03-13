let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function playNote(
  ac: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  const osc = ac.createOscillator();
  const gainNode = ac.createGain();
  const filter = ac.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, startTime);
  filter.Q.setValueAtTime(1.2, startTime);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.998, startTime + duration);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playHarmonic(ac: AudioContext, freq: number, startTime: number, duration: number, gain: number) {
  playNote(ac, freq, startTime, duration, gain * 0.7, "sine");
  playNote(ac, freq * 2, startTime, duration, gain * 0.15, "sine");
  playNote(ac, freq * 3, startTime, duration, gain * 0.06, "sine");
}

export function playTechOpsChime() {
  try {
    const ac = getCtx();
    const now = ac.currentTime + 0.02;

    // Unique 3-note chime: D5 → F#5 → A5 (D major chord ascending)
    // Warm, clear, professional — not a default OS sound
    playHarmonic(ac, 587.33, now,        0.55, 0.28); // D5
    playHarmonic(ac, 739.99, now + 0.14, 0.50, 0.24); // F#5
    playHarmonic(ac, 880.00, now + 0.27, 0.65, 0.20); // A5

    // Subtle resonance tail on the final note
    playNote(ac, 880.00, now + 0.27, 0.80, 0.06, "triangle");
  } catch {
    // Audio not available — silently ignore
  }
}

export function playTechOpsAlert() {
  try {
    const ac = getCtx();
    const now = ac.currentTime + 0.02;

    // Alert: two quick descending tones — distinct from chime
    playHarmonic(ac, 660.00, now,        0.30, 0.25);
    playHarmonic(ac, 523.25, now + 0.18, 0.45, 0.22);
  } catch {
    // Audio not available
  }
}

export function playTechOpsSuccess() {
  try {
    const ac = getCtx();
    const now = ac.currentTime + 0.02;

    // Success: upward fifth — E5 → B5
    playHarmonic(ac, 659.25, now,        0.35, 0.22);
    playHarmonic(ac, 987.77, now + 0.16, 0.55, 0.20);
    playNote(ac, 987.77, now + 0.16, 0.70, 0.05, "triangle");
  } catch {
    // Audio not available
  }
}
