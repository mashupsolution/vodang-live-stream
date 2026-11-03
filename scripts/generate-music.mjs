import { writeFileSync, unlinkSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SAMPLE_RATE = 44100;
const LOOP_DURATION = 48.0; // seconds
const XFADE_DURATION = 3.0; // seconds
const TOTAL_DURATION = LOOP_DURATION + XFADE_DURATION; // 51.0s

const loopSamples = Math.round(LOOP_DURATION * SAMPLE_RATE);
const xfadeSamples = Math.round(XFADE_DURATION * SAMPLE_RATE);
const totalSamples = Math.round(TOTAL_DURATION * SAMPLE_RATE);

console.log(
  `Synthesizing Xianxia Ambient Track: ${LOOP_DURATION}s seamless loop @ ${SAMPLE_RATE}Hz...`,
);

// Stereo sample buffers (working in float64 for precision and headroom)
const left = new Float64Array(totalSamples);
const right = new Float64Array(totalSamples);

// Pentatonic scale note frequencies (D Major Pentatonic: D, E, F#, A, B)
const NOTES = {
  D2: 73.416,
  A2: 110.0,
  D3: 146.832,
  E3: 164.814,
  Fs3: 184.997,
  A3: 220.0,
  B3: 246.942,
  D4: 293.665,
  E4: 329.628,
  Fs4: 369.994,
  A4: 440.0,
  B4: 493.883,
  D5: 587.33,
  E5: 659.255,
  Fs5: 739.989,
  A5: 880.0,
  B5: 987.767,
  D6: 1174.659,
  E6: 1318.51,
  Fs6: 1479.978,
};

// Helper: Seeded pseudo-random noise generator for deterministic synthesis
let seed = 42817;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1; // -1 to 1
}

// -------------------------------------------------------------
// LAYER 1: Warm Misty Cloud & Xiao Bamboo Flute
// -------------------------------------------------------------
console.log("- Synthesizing Layer 1: Warm Drone & Xiao Bamboo Flute...");

// 1.1 Low Breathing Drone (D2 + A2 + D3 with slow undulating warmth)
for (let i = 0; i < totalSamples; i++) {
  const t = i / SAMPLE_RATE;
  // Slow respiratory cycle (period ~9.6s)
  const breath = 0.8 + 0.2 * Math.sin(2 * Math.PI * (t / 9.6));

  // Drone partials with gentle micro-detuning between L and R for deep spatial mist
  const d2L =
    Math.sin(2 * Math.PI * 73.32 * t) +
    0.35 * Math.sin(2 * Math.PI * 146.64 * t) +
    0.15 * Math.sin(2 * Math.PI * 219.96 * t);
  const a2L =
    0.5 * Math.sin(2 * Math.PI * 109.85 * t) +
    0.18 * Math.sin(2 * Math.PI * 219.7 * t);

  const d2R =
    Math.sin(2 * Math.PI * 73.52 * t) +
    0.35 * Math.sin(2 * Math.PI * 147.04 * t) +
    0.15 * Math.sin(2 * Math.PI * 220.56 * t);
  const a2R =
    0.5 * Math.sin(2 * Math.PI * 110.15 * t) +
    0.18 * Math.sin(2 * Math.PI * 220.3 * t);

  const droneGain = 0.11 * breath;
  left[i] += (d2L + a2L) * droneGain;
  right[i] += (d2R + a2R) * droneGain;
}

// 1.2 Meditative Xiao Bamboo Flute Phrases
const xiaoPhrases = [
  { start: 2.0, dur: 5.2, freq: NOTES.A4, pan: -0.1 },
  { start: 7.6, dur: 4.4, freq: NOTES.B4, pan: 0.1 },
  { start: 12.4, dur: 5.8, freq: NOTES.D5, pan: -0.05 },
  { start: 18.6, dur: 4.8, freq: NOTES.A4, pan: 0.05 },
  { start: 23.8, dur: 5.2, freq: NOTES.Fs4, pan: -0.1 },
  { start: 29.4, dur: 4.6, freq: NOTES.E4, pan: 0.1 },
  { start: 34.4, dur: 5.6, freq: NOTES.D4, pan: -0.05 },
  { start: 40.4, dur: 5.0, freq: NOTES.Fs4, pan: 0.08 },
  { start: 45.8, dur: 5.0, freq: NOTES.A4, pan: -0.05 }, // overlaps seamlessly with head note
];

for (const phrase of xiaoPhrases) {
  const startSample = Math.round(phrase.start * SAMPLE_RATE);
  const durSamples = Math.round(phrase.dur * SAMPLE_RATE);
  const attackSamples = Math.round(1.5 * SAMPLE_RATE);
  const releaseSamples = Math.round(2.2 * SAMPLE_RATE);

  for (let s = 0; s < durSamples; s++) {
    const idx = startSample + s;
    if (idx >= totalSamples) break;

    const tNote = s / SAMPLE_RATE;

    // Delayed gentle vibrato (4.5 Hz, starts after 0.8s)
    let vib = 0;
    if (tNote > 0.8) {
      const vibRamp = Math.min(1.0, (tNote - 0.8) / 1.0);
      vib = 0.007 * vibRamp * Math.sin(2 * Math.PI * 4.5 * tNote);
    }
    const currentFreq = phrase.freq * (1 + vib);

    // Bamboo flute timbre: warm fundamental + mellow odd/even harmonics
    const phase = 2 * Math.PI * currentFreq * tNote;
    let wave =
      Math.sin(phase) +
      0.32 * Math.sin(2 * phase) +
      0.14 * Math.sin(3 * phase) +
      0.05 * Math.sin(4 * phase) +
      0.02 * Math.sin(5 * phase);

    // Subtle breath air noise mixed at low level
    const breathNoise = rand() * 0.035;
    wave += breathNoise;

    // Smooth envelope: cosine attack, exponential decay release
    let env = 1.0;
    if (s < attackSamples) {
      env = 0.5 * (1 - Math.cos((Math.PI * s) / attackSamples));
    } else if (s > durSamples - releaseSamples) {
      const relPos = (s - (durSamples - releaseSamples)) / releaseSamples;
      env = 0.5 * (1 + Math.cos(Math.PI * relPos));
    }

    const fltGain = 0.14 * env;
    const panL = 0.5 * (1 - phrase.pan);
    const panR = 0.5 * (1 + phrase.pan);

    left[idx] += wave * fltGain * panL;
    right[idx] += wave * fltGain * panR;
  }
}

// -------------------------------------------------------------
// LAYER 2: Plucked Guzheng (Zheng) Arpeggios & Mountain Echo Delay
// -------------------------------------------------------------
console.log("- Synthesizing Layer 2: Plucked Guzheng Arpeggios & Echo...");

const guzhengRawL = new Float64Array(totalSamples);
const guzhengRawR = new Float64Array(totalSamples);

const guzhengNotes = [
  { t: 1.0, note: NOTES.D3, pan: -0.25, vel: 0.85 },
  { t: 3.8, note: NOTES.A3, pan: 0.15, vel: 0.75 },
  { t: 5.2, note: NOTES.D4, pan: -0.1, vel: 0.8 },
  { t: 8.8, note: NOTES.Fs4, pan: 0.28, vel: 0.88 },
  { t: 11.0, note: NOTES.A4, pan: -0.2, vel: 0.9 },
  { t: 14.8, note: NOTES.E4, pan: 0.22, vel: 0.78 },
  { t: 17.2, note: NOTES.D4, pan: -0.12, vel: 0.75 },
  { t: 20.8, note: NOTES.B3, pan: 0.1, vel: 0.82 },
  { t: 24.2, note: NOTES.D3, pan: -0.22, vel: 0.85 },
  { t: 26.0, note: NOTES.A3, pan: 0.18, vel: 0.75 },
  { t: 28.5, note: NOTES.D4, pan: -0.1, vel: 0.82 },
  { t: 31.2, note: NOTES.Fs4, pan: 0.25, vel: 0.88 },
  { t: 33.0, note: NOTES.A4, pan: -0.22, vel: 0.92 },
  { t: 36.8, note: NOTES.B4, pan: 0.3, vel: 0.8 },
  { t: 39.2, note: NOTES.A4, pan: -0.15, vel: 0.82 },
  { t: 42.5, note: NOTES.E4, pan: 0.2, vel: 0.78 },
  { t: 44.4, note: NOTES.Fs4, pan: -0.12, vel: 0.8 },
  { t: 47.0, note: NOTES.D4, pan: 0.15, vel: 0.85 }, // tail echoes into 0s
];

for (const p of guzhengNotes) {
  const startSample = Math.round(p.t * SAMPLE_RATE);
  const durSec = 4.2;
  const durSamples = Math.round(durSec * SAMPLE_RATE);

  for (let s = 0; s < durSamples; s++) {
    const idx = startSample + s;
    if (idx >= totalSamples) break;

    const t = s / SAMPLE_RATE;

    // Multi-harmonic exponential decay string physics
    let pluck = 0;
    const numHarmonics = 10;
    for (let h = 1; h <= numHarmonics; h++) {
      const harmFreq = h * p.note;
      const harmAmp = 1 / Math.pow(h, 1.25);
      // Higher harmonics decay much faster
      const decay = Math.exp(-t * (1.6 + 2.8 * Math.pow(harmFreq / 440, 0.75)));
      pluck += harmAmp * decay * Math.sin(2 * Math.PI * harmFreq * t);
    }

    // Initial sharp attack plectrum contact (12ms)
    if (s < 0.012 * SAMPLE_RATE) {
      pluck += rand() * (1 - s / (0.012 * SAMPLE_RATE)) * 0.45;
    }

    const gain = 0.15 * p.vel;
    const panL = 0.5 * (1 - p.pan);
    const panR = 0.5 * (1 + p.pan);

    guzhengRawL[idx] += pluck * gain * panL;
    guzhengRawR[idx] += pluck * gain * panR;
  }
}

// Guzheng simulated temple mountain echo (dual tap: 380ms & 760ms, feedback 0.28)
const delay1Samples = Math.round(0.38 * SAMPLE_RATE);
const delay2Samples = Math.round(0.76 * SAMPLE_RATE);
const feedback = 0.28;

const guzhengEchoL = new Float64Array(totalSamples);
const guzhengEchoR = new Float64Array(totalSamples);

for (let i = 0; i < totalSamples; i++) {
  let inL = guzhengRawL[i];
  let inR = guzhengRawR[i];

  if (i >= delay1Samples) {
    inL +=
      guzhengEchoL[i - delay1Samples] * feedback * 0.85 +
      guzhengEchoR[i - delay1Samples] * feedback * 0.15;
  }
  if (i >= delay2Samples) {
    inR +=
      guzhengEchoR[i - delay2Samples] * feedback * 0.85 +
      guzhengEchoL[i - delay2Samples] * feedback * 0.15;
  }

  guzhengEchoL[i] = inL;
  guzhengEchoR[i] = inR;

  // Add wet + dry guzheng into master mix
  left[i] += inL;
  right[i] += inR;
}

// -------------------------------------------------------------
// LAYER 3: Distant Jade Wind Chimes (Ling)
// -------------------------------------------------------------
console.log("- Synthesizing Layer 3: Distant Jade Wind Chimes...");

const chimes = [
  { t: 6.2, freq: NOTES.D6, pan: -0.38, vel: 0.8 },
  { t: 16.5, freq: NOTES.E6, pan: 0.35, vel: 0.75 },
  { t: 27.2, freq: NOTES.A5, pan: -0.32, vel: 0.7 },
  { t: 38.6, freq: NOTES.Fs6, pan: 0.36, vel: 0.82 },
];

for (const c of chimes) {
  const startSample = Math.round(c.t * SAMPLE_RATE);
  const durSamples = Math.round(5.5 * SAMPLE_RATE);

  for (let s = 0; s < durSamples; s++) {
    const idx = startSample + s;
    if (idx >= totalSamples) break;

    const t = s / SAMPLE_RATE;

    // Inharmonic jade bell partials: f0, 2.76*f0, 5.40*f0, 8.92*f0
    const p1 = Math.sin(2 * Math.PI * c.freq * t) * Math.exp(-t * 0.75);
    const p2 =
      0.42 * Math.sin(2 * Math.PI * (c.freq * 2.76) * t) * Math.exp(-t * 2.1);
    const p3 =
      0.22 * Math.sin(2 * Math.PI * (c.freq * 5.4) * t) * Math.exp(-t * 4.2);
    const p4 =
      0.1 * Math.sin(2 * Math.PI * (c.freq * 8.92) * t) * Math.exp(-t * 7.5);

    const chimeWave = p1 + p2 + p3 + p4;
    const chimeGain = 0.075 * c.vel;
    const panL = 0.5 * (1 - c.pan);
    const panR = 0.5 * (1 + c.pan);

    left[idx] += chimeWave * chimeGain * panL;
    right[idx] += chimeWave * chimeGain * panR;
  }
}

// -------------------------------------------------------------
// SEAMLESS LOOP CROSSFADE (3.0s equal-power crossfade)
// -------------------------------------------------------------
console.log(
  "- Performing 3.0s equal-power cosine crossfade for seamless looping...",
);

for (let i = 0; i < xfadeSamples; i++) {
  const norm = i / xfadeSamples;
  // Equal power cosine / sine curves: gainHead^2 + gainTail^2 = 1.0
  const gainHead = Math.sin(norm * (Math.PI * 0.5));
  const gainTail = Math.cos(norm * (Math.PI * 0.5));

  // The audio tail at [loopSamples .. loopSamples + xfadeSamples] folds back to [0 .. xfadeSamples]
  const tailIdx = loopSamples + i;
  left[i] = left[i] * gainHead + left[tailIdx] * gainTail;
  right[i] = right[i] * gainHead + right[tailIdx] * gainTail;
}

// -------------------------------------------------------------
// MASTER NORMALIZATION (-6 dBFS peak headroom)
// -------------------------------------------------------------
console.log("- Normalizing to -6 dBFS peak headroom...");

let peak = 0;
for (let i = 0; i < loopSamples; i++) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
console.log(
  `  Raw unnormalized peak: ${peak.toFixed(4)} (${(20 * Math.log10(peak)).toFixed(2)} dBFS)`,
);

// Target -6 dBFS peak = 10^(-6/20) = 0.501187
const targetPeak = Math.pow(10, -6.0 / 20);
const normScale = peak > 0 ? targetPeak / peak : 1.0;

let sumSquares = 0;
for (let i = 0; i < loopSamples; i++) {
  left[i] *= normScale;
  right[i] *= normScale;
  sumSquares += left[i] * left[i] + right[i] * right[i];
}
const rms = Math.sqrt(sumSquares / (loopSamples * 2));
const rmsDb = 20 * Math.log10(rms);
console.log(
  `  Normalized peak: ${(20 * Math.log10(targetPeak)).toFixed(2)} dBFS`,
);
console.log(
  `  Integrated stereo RMS: ${rmsDb.toFixed(2)} dBFS (~-20 LUFS target range)`,
);

// -------------------------------------------------------------
// ENCODE TO 16-BIT PCM WAV & MP3 via FFMPEG
// -------------------------------------------------------------
console.log("- Writing 16-bit PCM WAV to /tmp/tu-tien-ambient.wav...");

const wavBuffer = Buffer.alloc(44 + loopSamples * 4); // 44-byte header + 4 bytes per stereo sample
// Write RIFF header
wavBuffer.write("RIFF", 0);
wavBuffer.writeUInt32LE(36 + loopSamples * 4, 4);
wavBuffer.write("WAVE", 8);
wavBuffer.write("fmt ", 12);
wavBuffer.writeUInt32LE(16, 16); // subchunk1 size
wavBuffer.writeUInt16LE(1, 20); // PCM format
wavBuffer.writeUInt16LE(2, 22); // Stereo
wavBuffer.writeUInt32LE(SAMPLE_RATE, 24);
wavBuffer.writeUInt32LE(SAMPLE_RATE * 4, 28); // byte rate (44100 * 2 channels * 2 bytes)
wavBuffer.writeUInt16LE(4, 32); // block align
wavBuffer.writeUInt16LE(16, 34); // bits per sample
wavBuffer.write("data", 36);
wavBuffer.writeUInt32LE(loopSamples * 4, 40);

let offset = 44;
for (let i = 0; i < loopSamples; i++) {
  // Clamp sample to [-1.0, 1.0] and convert to 16-bit signed integer
  const sampleL = Math.max(-1, Math.min(1, left[i]));
  const sampleR = Math.max(-1, Math.min(1, right[i]));

  const intL =
    sampleL < 0 ? Math.round(sampleL * 32768) : Math.round(sampleL * 32767);
  const intR =
    sampleR < 0 ? Math.round(sampleR * 32768) : Math.round(sampleR * 32767);

  wavBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, intL)), offset);
  wavBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, intR)), offset + 2);
  offset += 4;
}

const tmpWavPath = "/tmp/tu-tien-ambient.wav";
const outMp3Path = new URL(
  "../apps/web/public/assets/music.mp3",
  import.meta.url,
).pathname;

writeFileSync(tmpWavPath, wavBuffer);
console.log(
  `  Wrote ${(wavBuffer.length / (1024 * 1024)).toFixed(2)} MB PCM WAV.`,
);

console.log(`- Encoding to 192kbps CBR MP3 via ffmpeg...`);
execFileSync(
  "/opt/homebrew/bin/ffmpeg",
  [
    "-y",
    "-i",
    tmpWavPath,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "192k",
    outMp3Path,
  ],
  { stdio: "inherit" },
);

try {
  unlinkSync(tmpWavPath);
} catch {}

const stats = statSync(outMp3Path);
console.log(
  `✓ Generated ${outMp3Path}: ${(stats.size / 1024).toFixed(1)} KB (target > 500 KB)`,
);
