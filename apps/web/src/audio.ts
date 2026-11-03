import type { Ceremony, Snapshot } from "../../../packages/shared/src/index.ts";
import { Narrator } from "./narrator";

/** Music, ceremony, and narration use separate gain nodes under one master. */
export class Soundscape {
  private context?: AudioContext;
  private music?: HTMLAudioElement;
  private master?: GainNode;
  private ambient?: GainNode;
  private effects?: GainNode;
  private voice?: GainNode;
  private narrator?: Narrator;
  private ambientVolume = 0;
  private ambientDucked = false;
  private narratorEnabled = true;
  private seenCeremonies = new Set<string>();
  private seenAnnouncements = new Set<string>();
  private bootstrapped = false;
  private sessionId?: string;
  private lastState?: Snapshot;
  private voices = 0;
  private noiseBuffer?: AudioBuffer;

  async enable() {
    this.ensureContext();
    await Promise.all([this.context!.resume(), this.music!.play()]);
    this.ensureNarrator(this.lastState);
  }

  get active() {
    return this.context?.state === "running" && !this.music?.paused;
  }

  update(state: Snapshot) {
    const previousState = this.lastState;
    this.lastState = state;

    if (!this.bootstrapped) {
      this.bootstrapped = true;
      this.sessionId = state.session.id;
      this.seenCeremonies = new Set(state.ceremonies.map((item) => item.id));
      this.seenAnnouncements = new Set(
        state.announcements.map((item) => item.id),
      );
    } else if (state.session.id !== this.sessionId) {
      this.sessionId = state.session.id;
      this.narrator?.clear();
      this.narrator?.seed(
        state.session.id,
        state.announcements,
        state.serverTime,
      );
      this.seenAnnouncements = new Set(
        state.announcements.map((item) => item.id),
      );
      this.seenCeremonies = new Set(state.ceremonies.map((item) => item.id));
    }

    const newCeremonies = state.ceremonies.filter(
      (item) => !this.seenCeremonies.has(item.id),
    );
    for (const item of newCeremonies) this.seenCeremonies.add(item.id);

    const newAnnouncements = state.announcements.filter(
      (item) => !this.seenAnnouncements.has(item.id),
    );
    for (const item of newAnnouncements) this.seenAnnouncements.add(item.id);

    if (this.seenCeremonies.size > 512) {
      this.seenCeremonies = new Set(state.ceremonies.map((item) => item.id));
    }
    if (this.seenAnnouncements.size > 512) {
      this.seenAnnouncements = new Set(
        state.announcements.slice(-256).map((item) => item.id),
      );
    }

    this.narratorEnabled = state.settings.narratorEnabled;
    if (!this.narratorEnabled) this.narrator?.clear();
    if (this.narratorEnabled && this.active && !this.narrator) {
      this.ensureNarrator(previousState ?? state);
    }
    if (this.narratorEnabled && this.active && newAnnouncements.length) {
      this.narrator?.update(
        state.session.id,
        newAnnouncements,
        state.serverTime,
        true,
      );
    }

    if (!this.context || !this.ambient || !this.effects) return;
    const now = this.context.currentTime;
    this.ambientVolume = state.settings.ambientVolume;
    this.applyAmbient(0.3);
    this.effects.gain.setTargetAtTime(
      state.settings.ceremonyVolume ** 2,
      now,
      0.1,
    );
    if (this.voice) {
      this.voice.gain.setTargetAtTime(state.settings.narratorVolume, now, 0.1);
    }

    for (const ceremony of newCeremonies) {
      if (this.active && Math.abs(state.serverTime - ceremony.at) < 2500) {
        this.playCeremonySfx(ceremony);
      }
    }
  }

  async destroy() {
    this.narrator?.destroy();
    this.narrator = undefined;
    this.music?.pause();
    if (this.music) {
      this.music.removeAttribute("src");
      this.music.load();
    }
    await this.context?.close();
    this.context = undefined;
  }

  private ensureContext() {
    if (this.context) return;
    const context = (this.context = new AudioContext());
    this.master = context.createGain();
    this.master.gain.value = 0.4;

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 12;
    this.master.connect(limiter);
    limiter.connect(context.destination);

    this.ambient = context.createGain();
    this.effects = context.createGain();
    this.voice = context.createGain();

    this.ambientVolume = this.lastState?.settings.ambientVolume ?? 0;
    this.ambient.gain.value = 0;
    this.effects.gain.value = 0;
    this.voice.gain.value = this.lastState?.settings.narratorVolume ?? 0.85;

    this.ambient.connect(this.master);
    this.effects.connect(this.master);
    this.voice.connect(this.master);

    // Pre-create 0.5s pink/white noise buffer for lightning thunder rumbles
    const bufferSize = context.sampleRate * 0.5;
    this.noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.music = new Audio("/assets/music.mp3");
    this.music.loop = true;
    context.createMediaElementSource(this.music).connect(this.ambient);
    this.applyAmbient(0.01);
  }

  private ensureNarrator(seedState?: Snapshot) {
    if (!this.context || !this.voice || !seedState || this.narrator) return;
    this.narrator = new Narrator(this.context, this.voice, (ducked) =>
      this.duck(ducked),
    );
    this.narrator.seed(
      seedState.session.id,
      seedState.announcements,
      seedState.serverTime,
    );
  }

  private duck(ducked: boolean) {
    this.ambientDucked = ducked;
    this.applyAmbient(0.2);
  }

  private applyAmbient(timeConstant: number) {
    if (!this.context || !this.ambient) return;
    this.ambient.gain.setTargetAtTime(
      this.ambientVolume * (this.ambientDucked ? 0.25 : 1),
      this.context.currentTime,
      timeConstant,
    );
  }

  /**
   * Procedural Xianxia WebAudio SFX synthesis with bounded polyphony (<= 10 voices)
   * and pitch variation (+/- 2% detune per audio-design skill)
   */
  private playCeremonySfx(ceremony: Ceremony) {
    if (!this.context || !this.effects || this.voices >= 10) return;
    const action = ceremony.action;

    // Small random detune (+/- 2%)
    const detune = 1 + (Math.random() - 0.5) * 0.04;

    switch (action) {
      case "meditate":
      case "vow":
      case "follow":
        // Plucked pentatonic guzheng harmonic (D4 = 293.66Hz or A4 = 440Hz)
        this.playGuzhengNote((Math.random() > 0.5 ? 293.66 : 440) * detune);
        break;

      case "elixir":
      case "share":
        // Warm crystalline jade chime dyad (F#4 = 369.99Hz + D5 = 587.33Hz)
        this.playJadeDyad(369.99 * detune, 587.33 * detune);
        break;

      case "sword":
        // Shimmering sword-light harmonic glide (A4 -> E5 -> A5)
        this.playSwordShimmer(detune);
        break;

      case "tribulation-success":
        // Low thunder rumble swept down, followed by radiant 3-note ascending golden bell chord
        this.playThunderRumble(true, detune);
        break;

      case "tribulation-fail":
        // Muffled thunder pulse + grounding A3 jade gong
        this.playThunderRumble(false, detune);
        break;

      case "donor-tier":
      case "milestone":
      case "audience-milestone":
        // Deep D3 (146.83Hz) sect Dharma bell + ascending pentatonic flourish + celestial crane call
        this.playDharmaBellFlourish(detune);
        this.playCraneCall(detune);
        break;

      case "like":
        // Soft spirit ping
        this.playSpiritPing(880 * detune);
        break;

      default:
        // Default gentle chime
        this.playGuzhengNote(440 * detune);
        break;
    }
  }

  /** Guzheng pluck with triangle+sine blend and crisp 8ms attack */
  private playGuzhengNote(frequency: number) {
    if (!this.context || !this.effects || this.voices >= 10) return;
    const ctx = this.context;
    this.voices++;

    const now = ctx.currentTime;
    const oscTri = ctx.createOscillator();
    const oscSine = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscTri.type = "triangle";
    oscTri.frequency.setValueAtTime(frequency, now);

    oscSine.type = "sine";
    oscSine.frequency.setValueAtTime(frequency * 2, now); // 2nd harmonic

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.24, now + 0.008); // 8ms crisp pluck
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.8); // 1.8s resonance

    oscTri.connect(gainNode);
    oscSine.connect(gainNode);
    gainNode.connect(this.effects);

    oscTri.start(now);
    oscSine.start(now);
    oscTri.stop(now + 1.85);
    oscSine.stop(now + 1.85);

    oscTri.onended = () => {
      oscTri.disconnect();
      oscSine.disconnect();
      gainNode.disconnect();
      this.voices--;
    };
  }

  /** Warm crystalline jade chime dyad */
  private playJadeDyad(freq1: number, freq2: number) {
    if (!this.context || !this.effects || this.voices >= 10) return;
    const ctx = this.context;
    this.voices++;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq1, now);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.effects);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.45);
    osc2.stop(now + 2.45);

    osc1.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      gain.disconnect();
      this.voices--;
    };
  }

  /** Shimmering sword-light harmonic glide with crystalline resonance */
  public playSwordShimmer(detune: number = 1) {
    if (!this.context || !this.effects || this.voices >= 10) return;
    const ctx = this.context;
    this.voices++;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const sheen = ctx.createOscillator();
    const gain = ctx.createGain();
    const sheenGain = ctx.createGain();

    // Primary blade fundamental: A4 (440Hz) -> E5 (659.25Hz) -> A5 (880Hz)
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440 * detune, now);
    osc.frequency.exponentialRampToValueAtTime(659.25 * detune, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(880 * detune, now + 0.35);

    // Crystalline blade sheen harmonic: E6 (1318.5Hz) -> A6 (1760Hz)
    sheen.type = "sine";
    sheen.frequency.setValueAtTime(1318.5 * detune, now);
    sheen.frequency.exponentialRampToValueAtTime(1760 * detune, now + 0.25);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    sheenGain.gain.setValueAtTime(0.0001, now);
    sheenGain.gain.linearRampToValueAtTime(0.07, now + 0.02);
    sheenGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc.connect(gain);
    sheen.connect(sheenGain);
    sheenGain.connect(gain);
    gain.connect(this.effects);

    osc.start(now);
    sheen.start(now);
    osc.stop(now + 0.9);
    sheen.stop(now + 0.7);

    osc.onended = () => {
      osc.disconnect();
      sheen.disconnect();
      sheenGain.disconnect();
      gain.disconnect();
      this.voices--;
    };
  }

  /**
   * Celestial Crane (Tiên Hạc) call: ethereal high reed/flute timbre echoing across mountain peaks.
   * Uses pentatonic soaring melody (A5 -> D6) with gentle vibrato and lingering resonance.
   */
  public playCraneCall(detune: number = 1) {
    if (!this.context || !this.effects || this.voices >= 10) return;
    const ctx = this.context;
    this.voices++;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscHarmonic = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const gain = ctx.createGain();

    // Crane call pitch gesture: A5 (880Hz) rising gracefully to D6 (1174.66Hz)
    const baseFreq = 880 * detune;
    const peakFreq = 1174.66 * detune;

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(peakFreq * 0.98, now + 0.45);

    // Subtle breath/reed harmonic (second harmonic with soft presence)
    oscHarmonic.type = "triangle";
    oscHarmonic.frequency.setValueAtTime(baseFreq * 2, now);
    oscHarmonic.frequency.exponentialRampToValueAtTime(
      peakFreq * 2,
      now + 0.12,
    );

    // Ethereal vibrato (~5.5Hz) kicking in during the sustained glide
    vibrato.frequency.setValueAtTime(5.5, now);
    vibratoGain.gain.setValueAtTime(0, now);
    vibratoGain.gain.linearRampToValueAtTime(8 * detune, now + 0.15);
    vibrato.connect(osc.frequency);

    // Envelope: swift gentle attack, soaring sustain, lingering mountain echo
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.03, now);
    oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(gain);

    osc.connect(gain);
    gain.connect(this.effects);

    vibrato.start(now);
    osc.start(now);
    oscHarmonic.start(now);

    vibrato.stop(now + 1.85);
    osc.stop(now + 1.85);
    oscHarmonic.stop(now + 1.85);

    osc.onended = () => {
      osc.disconnect();
      oscHarmonic.disconnect();
      vibrato.disconnect();
      vibratoGain.disconnect();
      harmonicGain.disconnect();
      gain.disconnect();
      this.voices--;
    };
  }

  /** Lightning strike thunder rumble + chord or grounding gong */
  private playThunderRumble(success: boolean, detune: number) {
    if (!this.context || !this.effects || this.voices >= 9) return;
    const ctx = this.context;
    this.voices++;

    const now = ctx.currentTime;

    // 1. Low thunder rumble (90Hz swept down to 45Hz)
    const oscRumble = ctx.createOscillator();
    const gainRumble = ctx.createGain();

    oscRumble.type = "sine";
    oscRumble.frequency.setValueAtTime(90 * detune, now);
    oscRumble.frequency.exponentialRampToValueAtTime(42 * detune, now + 0.4);

    gainRumble.gain.setValueAtTime(0.0001, now);
    gainRumble.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gainRumble.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    oscRumble.connect(gainRumble);
    gainRumble.connect(this.effects);

    oscRumble.start(now);
    oscRumble.stop(now + 0.9);

    // Filtered noise snap
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.16, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.effects);
      noise.start(now);
      noise.stop(now + 0.38);
    }

    if (success) {
      // 3-note ascending golden bell chord (D5=587.33Hz -> F#5=739.99Hz -> A5=880Hz) at +120ms
      const notes = [587.33, 739.99, 880];
      notes.forEach((freq, idx) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        const startT = now + 0.12 + idx * 0.08;

        chordOsc.type = "sine";
        chordOsc.frequency.setValueAtTime(freq * detune, startT);

        chordGain.gain.setValueAtTime(0.0001, startT);
        chordGain.gain.linearRampToValueAtTime(0.18, startT + 0.015);
        chordGain.gain.exponentialRampToValueAtTime(0.0001, startT + 2.2);

        chordOsc.connect(chordGain);
        chordGain.connect(this.effects!);

        chordOsc.start(startT);
        chordOsc.stop(startT + 2.25);
        chordOsc.onended = () => {
          chordOsc.disconnect();
          chordGain.disconnect();
        };
      });
    } else {
      // Grounding A3 (220Hz) jade shield gong
      const gongOsc = ctx.createOscillator();
      const gongGain = ctx.createGain();
      const startT = now + 0.1;

      gongOsc.type = "triangle";
      gongOsc.frequency.setValueAtTime(220 * detune, startT);

      gongGain.gain.setValueAtTime(0.0001, startT);
      gongGain.gain.linearRampToValueAtTime(0.2, startT + 0.02);
      gongGain.gain.exponentialRampToValueAtTime(0.0001, startT + 1.4);

      gongOsc.connect(gongGain);
      gongGain.connect(this.effects);

      gongOsc.start(startT);
      gongOsc.stop(startT + 1.45);
      gongOsc.onended = () => {
        gongOsc.disconnect();
        gongGain.disconnect();
      };
    }

    oscRumble.onended = () => {
      oscRumble.disconnect();
      gainRumble.disconnect();
      this.voices--;
    };
  }

  /** Deep D3 (146.83Hz) sect Dharma bell + ascending pentatonic flourish */
  private playDharmaBellFlourish(detune: number) {
    if (!this.context || !this.effects || this.voices >= 9) return;
    const ctx = this.context;
    this.voices++;

    const now = ctx.currentTime;
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();

    bellOsc.type = "sine";
    bellOsc.frequency.setValueAtTime(146.83 * detune, now); // D3

    bellGain.gain.setValueAtTime(0.0001, now);
    bellGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

    bellOsc.connect(bellGain);
    bellGain.connect(this.effects);

    bellOsc.start(now);
    bellOsc.stop(now + 3.85);

    // Pentatonic flourish notes (D4 -> F#4 -> A4 -> D5)
    const flourish = [293.66, 369.99, 440, 587.33];
    flourish.forEach((f, idx) => {
      const flOsc = ctx.createOscillator();
      const flGain = ctx.createGain();
      const t = now + 0.15 + idx * 0.12;

      flOsc.type = "sine";
      flOsc.frequency.setValueAtTime(f * detune, t);

      flGain.gain.setValueAtTime(0.0001, t);
      flGain.gain.linearRampToValueAtTime(0.14, t + 0.015);
      flGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

      flOsc.connect(flGain);
      flGain.connect(this.effects!);

      flOsc.start(t);
      flOsc.stop(t + 1.65);
      flOsc.onended = () => {
        flOsc.disconnect();
        flGain.disconnect();
      };
    });

    bellOsc.onended = () => {
      bellOsc.disconnect();
      bellGain.disconnect();
      this.voices--;
    };
  }

  /** Soft spirit ping for likes */
  private playSpiritPing(frequency: number) {
    if (!this.context || !this.effects || this.voices >= 10) return;
    const ctx = this.context;
    this.voices++;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.effects);

    osc.start(now);
    osc.stop(now + 0.85);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      this.voices--;
    };
  }
}
