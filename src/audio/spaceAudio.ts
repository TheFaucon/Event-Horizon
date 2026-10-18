/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Procedural Space Soundscape Engine using the Web Audio API.
 * Synthesizes deep space gravitational resonance, accretion disk plasma hum,
 * and matter probe launch acoustics with zero external audio assets.
 */
class SpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private masterGain: GainNode | null = null;
  
  // Oscillators & Nodes
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneSub: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;

  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.35, this.ctx.currentTime + 2.5);
      this.masterGain.connect(this.ctx.destination);

      // 1. Deep Sub-Bass Singularity Drone (42 Hz fundamental)
      this.droneSub = this.ctx.createOscillator();
      this.droneSub.type = 'sine';
      this.droneSub.frequency.setValueAtTime(42, this.ctx.currentTime);
      const subGain = this.ctx.createGain();
      subGain.gain.value = 0.45;
      this.droneSub.connect(subGain);
      subGain.connect(this.masterGain);
      this.droneSub.start();

      // 2. Dual Detuned Warm Cosmic Harmonic Oscillators
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'triangle';
      this.droneOsc1.frequency.setValueAtTime(84, this.ctx.currentTime);

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'sine';
      this.droneOsc2.frequency.setValueAtTime(126.3, this.ctx.currentTime); // Musical fifth

      const harmonicFilter = this.ctx.createBiquadFilter();
      harmonicFilter.type = 'lowpass';
      harmonicFilter.frequency.setValueAtTime(240, this.ctx.currentTime);
      harmonicFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      const harmonicGain = this.ctx.createGain();
      harmonicGain.gain.value = 0.22;

      this.droneOsc1.connect(harmonicFilter);
      this.droneOsc2.connect(harmonicFilter);
      harmonicFilter.connect(harmonicGain);
      harmonicGain.connect(this.masterGain);

      this.droneOsc1.start();
      this.droneOsc2.start();

      // 3. Accretion Disk Plasma Noise (Filtered white/brownian noise)
      const bufferSize = this.ctx.sampleRate * 3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise approximation
        lastOut = output[i];
        output[i] *= 3.5;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setValueAtTime(480, this.ctx.currentTime);
      this.noiseFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.value = 0.12;

      // 4. Subtle LFO to simulate swirling plasma turbulence
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime); // 0.18 Hz slow cycle
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.noiseFilter.frequency);

      this.noiseNode.connect(this.noiseFilter);
      this.noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      this.lfo.start();
      this.noiseNode.start();

      this.isRunning = true;
    } catch {
      this.isRunning = false;
    }
  }

  public stop(): void {
    if (!this.isRunning || !this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      setTimeout(() => {
        try {
          this.droneOsc1?.stop();
          this.droneOsc2?.stop();
          this.droneSub?.stop();
          this.noiseNode?.stop();
          this.lfo?.stop();
          this.ctx?.close();
        } catch {
          // ignore cleanup errors
        }
        this.ctx = null;
        this.isRunning = false;
      }, 1300);
    } catch {
      this.isRunning = false;
    }
  }

  /**
   * Sound effect triggered when launching a probe into the black hole.
   */
  public playProbeLaunch(): void {
    if (!this.ctx || !this.isRunning) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.8);
      osc.frequency.exponentialRampToValueAtTime(45, now + 1.4);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 1.5);
    } catch {
      // Audio fallback silent
    }
  }

  private lastImpactTime: number = 0;

  /**
   * Sound effect for high-energy asteroid/probe collisions and fragmentation.
   */
  public playImpactCrunch(energy: number = 20.0): void {
    if (!this.ctx || !this.isRunning) return;
    const now = performance.now();
    if (now - this.lastImpactTime < 90) return; // Throttle to prevent audio buffer saturation
    this.lastImpactTime = now;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Pitch inversely proportional to impact energy
      const baseFreq = Math.max(90, 240 - Math.min(energy, 100));
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, t);
      filter.Q.value = 3.0;

      const vol = Math.min(0.25, 0.08 + (energy / 150) * 0.15);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }

      osc.start(t);
      osc.stop(t + 0.2);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Heavy gravitational rumble when a massive Rogue Planetoid is injected.
   */
  public playPlanetoidRoar(): void {
    if (!this.ctx || !this.isRunning) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, t);
      osc1.frequency.exponentialRampToValueAtTime(32, t + 2.0);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(28, t);
      osc2.frequency.exponentialRampToValueAtTime(18, t + 2.5);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 2.6);
      osc2.stop(t + 2.6);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Sound effect when spawning a new planet or celestial body into orbit.
   */
  public playCelestialSpawn(): void {
    if (!this.ctx || !this.isRunning) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Celestial fifth chord (A4 440Hz -> E5 660Hz) with gentle glide
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.35);
      osc1.frequency.exponentialRampToValueAtTime(330, now + 1.2);

      osc2.frequency.setValueAtTime(330, now);
      osc2.frequency.exponentialRampToValueAtTime(660, now + 0.35);
      osc2.frequency.exponentialRampToValueAtTime(495, now + 1.4);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc1.connect(gain);
      osc2.connect(gain);

      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.7);
      osc2.stop(now + 1.7);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Modulate audio parameters based on simulation speed or proximity.
   */
  public updateParameters(speedMultiplier: number): void {
    if (!this.ctx || !this.isRunning || !this.noiseFilter) return;
    try {
      const targetFreq = 400 + Math.min(speedMultiplier, 3.0) * 160;
      this.noiseFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
    } catch {
      // Ignore
    }
  }
}

export const spaceAudio = new SpaceAudioEngine();
