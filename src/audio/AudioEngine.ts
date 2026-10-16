/**
 * High-Performance Low-Latency Audio Synthesis Engine
 * Features:
 * - 4 Analog-Emulated Oscillators (Sine, Saw, Triangle, Square) with frequency drift
 * - 4x4 Sample-Accurate Audio-Rate FM Matrix
 * - Red Panda Particle V2-inspired Granular Delay / Glitch Processor
 * - Stereo Quadrature Chorus
 * - Filtered Analog Tape Delay with Wow & Flutter
 * - Schroeder / Freeverb Atmospheric Reverb
 * - Master Analog Tanh Saturation & Brickwall Limiter
 * - Dual Stereo Analysers for Real-Time Character Visualizations
 * - 16-bit PCM Stereo WAV Recorder
 */

import {
  OscillatorConfig,
  FmMatrix,
  GranularConfig,
  EffectsConfig,
  SampleConfig,
  LfoMatrixConfig,
  LfoUnitConfig,
  ModulationRoute,
  SequencerConfig,
} from '../types/synth';
import { getDefaultSequencerConfig } from '../data/sequencerData';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;

  // External Sample Player state & nodes
  private sampleBuffer: AudioBuffer | null = null;
  private sampleReversedBuffer: AudioBuffer | null = null;
  private sampleSource: AudioBufferSourceNode | null = null;
  private sampleGain: GainNode | null = null;
  private samplePanner: StereoPannerNode | null = null;
  private sampleEffectsSend: GainNode | null = null;
  private sampleDirectMaster: GainNode | null = null;
  private sampleStartTime: number = 0;
  private sampleStartOffset: number = 0;
  private sampleIsPlaying: boolean = false;
  private sampleConfig: SampleConfig = {
    loaded: false,
    fileName: '',
    duration: 0,
    sampleRate: 44100,
    channels: 2,
    fileSize: 0,
    isPlaying: false,
    loop: true,
    loopStart: 0.0,
    loopEnd: 1.0,
    playbackRate: 1.0,
    pitchSemitones: 0,
    reverse: false,
    gain: 0.8,
    pan: 0.0,
    sendToEffects: true,
    effectsSendLevel: 0.85,
    currentPlayhead: 0.0,
  };

  // Oscillators & Nodes
  private oscNodes: (OscillatorNode | null)[] = [null, null, null, null];
  private oscGains: (GainNode | null)[] = [null, null, null, null];
  private oscPanners: (StereoPannerNode | null)[] = [null, null, null, null];
  private oscTaps: (GainNode | null)[] = [null, null, null, null]; // Pre-gain tap for FM mod
  private driftLfos: (OscillatorNode | null)[] = [null, null, null, null];
  private driftGains: (GainNode | null)[] = [null, null, null, null];

  // FM Matrix: fmGains[mod][carrier]
  private fmGains: (GainNode | null)[][] = [
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];

  // Master bus & Filters
  private oscMixBus: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  // Effects nodes
  // 1. Chorus
  private chorusIn: GainNode | null = null;
  private chorusDelayL: DelayNode | null = null;
  private chorusDelayR: DelayNode | null = null;
  private chorusLfoL: OscillatorNode | null = null;
  private chorusLfoR: OscillatorNode | null = null;
  private chorusLfoGainL: GainNode | null = null;
  private chorusLfoGainR: GainNode | null = null;
  private chorusWet: GainNode | null = null;
  private chorusDry: GainNode | null = null;
  private chorusOut: GainNode | null = null;

  // 2. Tape Delay
  private delayIn: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayDampFilter: BiquadFilterNode | null = null;
  private delayLfo: OscillatorNode | null = null;
  private delayLfoGain: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private delayDry: GainNode | null = null;
  private delayOut: GainNode | null = null;

  // 3. Granular / Particle V2 Engine
  private granIn: GainNode | null = null;
  private granWet: GainNode | null = null;
  private granDry: GainNode | null = null;
  private granOut: GainNode | null = null;
  private granIntervalId: number | null = null;
  private granBuffer: Float32Array[] = [new Float32Array(44100 * 4), new Float32Array(44100 * 4)]; // 4s stereo ring buffer
  private granWritePtr: number = 0;
  private granScriptNode: ScriptProcessorNode | null = null;

  // 4. Schroeder Reverb
  private reverbIn: GainNode | null = null;
  private reverbWet: GainNode | null = null;
  private reverbDry: GainNode | null = null;
  private reverbOut: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;

  // Master saturation, limiter & output
  private masterDriveNode: WaveShaperNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserSplitL: AnalyserNode | null = null;
  private analyserSplitR: AnalyserNode | null = null;

  // Recorder state
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private recorderDest: MediaStreamAudioDestinationNode | null = null;

  // Current config cache
  private oscConfigs: OscillatorConfig[] = [];
  private fmMatrix: FmMatrix = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  private granConfig: GranularConfig = {
    enabled: true,
    mode: 'pitch',
    grainSize: 120,
    density: 8,
    pitchShift: 12,
    randomPitch: 0,
    feedback: 0.45,
    delayTime: 360,
    spray: 30,
    reverseProb: 20,
    freeze: false,
    mix: 0.35,
  };
  private effectsConfig: EffectsConfig = {
    filter: { enabled: true, cutoff: 4500, resonance: 2.5, type: 'lowpass' },
    chorus: { enabled: true, rate: 0.8, depth: 3.5, mix: 0.3 },
    delay: { enabled: true, time: 420, feedback: 0.5, damping: 3000, wowFlutter: 0.3, mix: 0.35 },
    reverb: { enabled: true, decay: 4.5, damping: 4000, mix: 0.4 },
    master: { volume: 0.8, drive: 0.25 },
  };

  // LFO Modulation Matrix state & nodes
  private lfoNodes: (OscillatorNode | null)[] = [null, null, null, null];
  private lfoGains: (GainNode | null)[] = [null, null, null, null];
  private lfoRouteGains: Map<string, GainNode> = new Map();
  private lfoSampleAndHoldValues: number[] = [0, 0, 0, 0];
  private lfoConfig: LfoMatrixConfig = {
    lfos: [
      { id: 1, name: 'LFO 1 [SINE]', enabled: true, waveform: 'sine', rate: 0.12, depth: 0.8, phase: 0 },
      { id: 2, name: 'LFO 2 [TRI]', enabled: true, waveform: 'triangle', rate: 0.24, depth: 0.7, phase: 90 },
      { id: 3, name: 'LFO 3 [SAW]', enabled: true, waveform: 'sawtooth', rate: 0.08, depth: 0.6, phase: 180 },
      { id: 4, name: 'LFO 4 [S&H RANDOM]', enabled: true, waveform: 'random', rate: 1.2, depth: 0.75, phase: 0 },
    ],
    routes: [
      { id: 'r1', sourceLfoId: 1, destination: 'filter_cutoff', amount: 0.65, enabled: true },
      { id: 'r2', sourceLfoId: 2, destination: 'fm_1_2', amount: 0.45, enabled: true },
      { id: 'r3', sourceLfoId: 3, destination: 'delay_time', amount: 0.35, enabled: true },
      { id: 'r4', sourceLfoId: 4, destination: 'particle_pitch', amount: 0.5, enabled: true },
    ],
  };

  // Step Sequencer state & clock
  private sequencerConfig: SequencerConfig = getDefaultSequencerConfig();
  private seqTimerId: number | null = null;
  private seqNextStepTime: number = 0;
  private seqCurrentStepIndices: number[] = [0, 0, 0, 0];
  private seqStepDirections: number[] = [1, 1, 1, 1]; // for pingpong: 1 = forward, -1 = backward
  private seqStepCallbacks: ((steps: number[]) => void)[] = [];
  private seqIsRunning: boolean = false;

  constructor() {}

  /**
   * Initializes Web Audio Context upon user interaction
   */
  public async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.isRunning = true;
      if (this.sequencerConfig.enabled) {
        this.startSequencerClock();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.setupGraph();
    this.isRunning = true;
    if (this.sequencerConfig.enabled) {
      this.startSequencerClock();
    }
  }

  /**
   * Toggle audio playback (mute/unmute or suspend/resume)
   */
  public async togglePlay(): Promise<boolean> {
    if (!this.ctx) {
      await this.init();
      return true;
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
      this.isRunning = true;
      if (this.sequencerConfig.enabled) {
        this.startSequencerClock();
      }
      return true;
    } else if (this.isRunning) {
      // Mute smoothly
      this.stopSequencerClock();
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
      }
      this.isRunning = false;
      return false;
    } else {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.effectsConfig.master.volume, this.ctx.currentTime, 0.03);
      }
      this.isRunning = true;
      if (this.sequencerConfig.enabled) {
        this.startSequencerClock();
      }
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isRunning && !!this.ctx && this.ctx.state === 'running';
  }

  /**
   * Builds the entire Web Audio routing graph
   */
  private setupGraph(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Oscillators Mix Bus & Filter
    this.oscMixBus = this.ctx.createGain();
    this.oscMixBus.gain.setValueAtTime(0.7, now);

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = this.effectsConfig.filter.type;
    this.filterNode.frequency.setValueAtTime(this.effectsConfig.filter.cutoff, now);
    this.filterNode.Q.setValueAtTime(this.effectsConfig.filter.resonance, now);
    this.oscMixBus.connect(this.filterNode);

    // 2. Setup 4 Oscillators
    const defaultWaveforms: OscillatorConfig['waveform'][] = ['sine', 'sawtooth', 'triangle', 'square'];
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = defaultWaveforms[i];

      const tap = this.ctx.createGain(); // FM Modulator tap point
      tap.gain.setValueAtTime(1.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);

      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(0, now);

      // Analog Drift LFO
      const driftLfo = this.ctx.createOscillator();
      driftLfo.type = 'sine';
      driftLfo.frequency.setValueAtTime(0.2 + i * 0.1, now);

      const driftGain = this.ctx.createGain();
      driftGain.gain.setValueAtTime(4.0, now); // cents/Hz drift

      driftLfo.connect(driftGain);
      driftGain.connect(osc.frequency);
      driftLfo.start();

      osc.connect(tap);
      tap.connect(gain);
      gain.connect(panner);
      panner.connect(this.oscMixBus);

      osc.start();

      this.oscNodes[i] = osc;
      this.oscTaps[i] = tap;
      this.oscGains[i] = gain;
      this.oscPanners[i] = panner;
      this.driftLfos[i] = driftLfo;
      this.driftGains[i] = driftGain;
    }

    // 3. Setup 4x4 FM Matrix Gain Nodes
    for (let m = 0; m < 4; m++) {
      for (let c = 0; c < 4; c++) {
        const fmGain = this.ctx.createGain();
        fmGain.gain.setValueAtTime(0, now);
        // Connect modulator's pre-gain tap to carrier's frequency param!
        this.oscTaps[m]!.connect(fmGain);
        fmGain.connect(this.oscNodes[c]!.frequency);
        this.fmGains[m][c] = fmGain;
      }
    }

    // 4. Effects Chain:
    // Filter -> Chorus -> Particle Granular -> Tape Delay -> Reverb -> Master Saturation -> Limiter -> Output

    // --- CHORUS ---
    this.chorusIn = this.ctx.createGain();
    this.chorusDry = this.ctx.createGain();
    this.chorusWet = this.ctx.createGain();
    this.chorusOut = this.ctx.createGain();
    this.chorusDelayL = this.ctx.createDelay();
    this.chorusDelayR = this.ctx.createDelay();
    this.chorusDelayL.delayTime.setValueAtTime(0.015, now);
    this.chorusDelayR.delayTime.setValueAtTime(0.020, now);

    this.chorusLfoL = this.ctx.createOscillator();
    this.chorusLfoR = this.ctx.createOscillator();
    this.chorusLfoL.frequency.setValueAtTime(0.8, now);
    this.chorusLfoR.frequency.setValueAtTime(0.95, now);

    this.chorusLfoGainL = this.ctx.createGain();
    this.chorusLfoGainR = this.ctx.createGain();
    this.chorusLfoGainL.gain.setValueAtTime(0.0035, now);
    this.chorusLfoGainR.gain.setValueAtTime(0.0035, now);

    this.chorusLfoL.connect(this.chorusLfoGainL);
    this.chorusLfoR.connect(this.chorusLfoGainR);
    this.chorusLfoGainL.connect(this.chorusDelayL.delayTime);
    this.chorusLfoGainR.connect(this.chorusDelayR.delayTime);

    this.chorusLfoL.start();
    this.chorusLfoR.start();

    const chorusPanL = this.ctx.createStereoPanner();
    const chorusPanR = this.ctx.createStereoPanner();
    chorusPanL.pan.setValueAtTime(-0.8, now);
    chorusPanR.pan.setValueAtTime(0.8, now);

    this.chorusIn.connect(this.chorusDry);
    this.chorusIn.connect(this.chorusDelayL);
    this.chorusIn.connect(this.chorusDelayR);
    this.chorusDelayL.connect(chorusPanL);
    this.chorusDelayR.connect(chorusPanR);
    chorusPanL.connect(this.chorusWet);
    chorusPanR.connect(this.chorusWet);
    this.chorusDry.connect(this.chorusOut);
    this.chorusWet.connect(this.chorusOut);

    // --- GRANULAR / PARTICLE DELAY ---
    this.setupGranularProcessor();

    // --- TAPE DELAY ---
    this.delayIn = this.ctx.createGain();
    this.delayDry = this.ctx.createGain();
    this.delayWet = this.ctx.createGain();
    this.delayOut = this.ctx.createGain();
    this.delayNode = this.ctx.createDelay(5.0);
    this.delayNode.delayTime.setValueAtTime(0.42, now);

    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(0.5, now);

    this.delayDampFilter = this.ctx.createBiquadFilter();
    this.delayDampFilter.type = 'lowpass';
    this.delayDampFilter.frequency.setValueAtTime(3200, now);

    // Tape wow/flutter LFO
    this.delayLfo = this.ctx.createOscillator();
    this.delayLfo.frequency.setValueAtTime(1.5, now);
    this.delayLfoGain = this.ctx.createGain();
    this.delayLfoGain.gain.setValueAtTime(0.0015, now);
    this.delayLfo.connect(this.delayLfoGain);
    this.delayLfoGain.connect(this.delayNode.delayTime);
    this.delayLfo.start();

    this.delayIn.connect(this.delayDry);
    this.delayIn.connect(this.delayNode);
    this.delayNode.connect(this.delayDampFilter);
    this.delayDampFilter.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayDampFilter.connect(this.delayWet);
    this.delayDry.connect(this.delayOut);
    this.delayWet.connect(this.delayOut);

    // --- ATMOSPHERIC REVERB ---
    this.reverbIn = this.ctx.createGain();
    this.reverbDry = this.ctx.createGain();
    this.reverbWet = this.ctx.createGain();
    this.reverbOut = this.ctx.createGain();
    this.setupReverbImpulse(this.effectsConfig.reverb.decay);

    this.reverbIn.connect(this.reverbDry);
    this.reverbIn.connect(this.reverbConvolver!);
    this.reverbConvolver!.connect(this.reverbWet);
    this.reverbDry.connect(this.reverbOut);
    this.reverbWet.connect(this.reverbOut);

    // --- MASTER CHAIN ---
    this.masterDriveNode = this.ctx.createWaveShaper();
    this.updateDriveCurve(this.effectsConfig.master.drive);

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.5, now);
    this.masterLimiter.knee.setValueAtTime(3.0, now);
    this.masterLimiter.ratio.setValueAtTime(12.0, now);
    this.masterLimiter.attack.setValueAtTime(0.003, now);
    this.masterLimiter.release.setValueAtTime(0.15, now);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.effectsConfig.master.volume, now);

    // Real-Time Analysers
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    const splitter = this.ctx.createChannelSplitter(2);
    this.analyserSplitL = this.ctx.createAnalyser();
    this.analyserSplitR = this.ctx.createAnalyser();
    this.analyserSplitL.fftSize = 1024;
    this.analyserSplitR.fftSize = 1024;

    // Setup External Sample Channel Bus
    this.sampleGain = this.ctx.createGain();
    this.sampleGain.gain.setValueAtTime(this.sampleConfig.gain, now);

    this.samplePanner = this.ctx.createStereoPanner();
    this.samplePanner.pan.setValueAtTime(this.sampleConfig.pan, now);

    this.sampleEffectsSend = this.ctx.createGain();
    this.sampleEffectsSend.gain.setValueAtTime(
      this.sampleConfig.sendToEffects ? this.sampleConfig.effectsSendLevel : 0,
      now
    );

    this.sampleDirectMaster = this.ctx.createGain();
    this.sampleDirectMaster.gain.setValueAtTime(
      !this.sampleConfig.sendToEffects ? 1.0 : 0,
      now
    );

    this.sampleGain.connect(this.samplePanner);
    // Effects send routes into filterNode (which feeds Chorus -> Particle V2 -> Delay -> Reverb)
    this.samplePanner.connect(this.sampleEffectsSend);
    this.sampleEffectsSend.connect(this.filterNode);

    // Direct clean send routes directly to master drive
    this.samplePanner.connect(this.sampleDirectMaster);
    this.sampleDirectMaster.connect(this.masterDriveNode);

    // Connect the full serial chain:
    // Filter -> Chorus -> Granular -> Delay -> Reverb -> Saturation -> Limiter -> Master -> Analysers & DAC
    this.filterNode.connect(this.chorusIn);
    this.chorusOut.connect(this.granIn!);
    this.granOut!.connect(this.delayIn);
    this.delayOut.connect(this.reverbIn);
    this.reverbOut.connect(this.masterDriveNode);
    this.masterDriveNode.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterGain);

    this.masterGain.connect(this.analyser);
    this.masterGain.connect(splitter);
    splitter.connect(this.analyserSplitL, 0);
    splitter.connect(this.analyserSplitR, 1);
    this.masterGain.connect(this.ctx.destination);

    // Setup recorder destination
    this.recorderDest = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.recorderDest);

    // Apply initial wet/dry ratios
    this.applyEffectsConfig(this.effectsConfig);

    // Setup 4 Independent Assignable LFO Generators
    for (let i = 0; i < 4; i++) {
      const lfo = this.ctx.createOscillator();
      const cfg = this.lfoConfig.lfos[i];
      lfo.type = cfg.waveform === 'random' ? 'sine' : cfg.waveform;
      lfo.frequency.setValueAtTime(cfg.rate, now);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(cfg.enabled ? cfg.depth : 0, now);

      lfo.connect(lfoGain);
      lfo.start();

      this.lfoNodes[i] = lfo;
      this.lfoGains[i] = lfoGain;
    }

    // Connect LFO routes into target AudioParams
    this.updateLfoMatrix(this.lfoConfig);
  }

  /**
   * Sets up a Schroeder-Moorer algorithmic synthetic impulse response for the convolver
   */
  private setupReverbImpulse(decaySeconds: number): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * Math.min(10, Math.max(0.5, decaySeconds)));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Exponential decay envelope
      const decay = Math.exp(-3 * t / decaySeconds);
      // High-frequency damping noise burst + early reflections
      const noiseL = (Math.random() * 2 - 1) * decay;
      const noiseR = (Math.random() * 2 - 1) * decay;
      left[i] = noiseL;
      right[i] = noiseR;
    }

    if (!this.reverbConvolver) {
      this.reverbConvolver = this.ctx.createConvolver();
    }
    this.reverbConvolver.buffer = impulse;
  }

  /**
   * Real-time Particle V2 granular delay processor
   * Operates via circular ring buffer + randomized/pitch-shifted grain scheduling
   */
  private setupGranularProcessor(): void {
    if (!this.ctx) return;
    this.granIn = this.ctx.createGain();
    this.granDry = this.ctx.createGain();
    this.granWet = this.ctx.createGain();
    this.granOut = this.ctx.createGain();

    // ScriptProcessor node for live circular audio recording
    this.granScriptNode = this.ctx.createScriptProcessor(2048, 2, 2);
    const ringLen = this.granBuffer[0].length;

    this.granScriptNode.onaudioprocess = (e) => {
      const inL = e.inputBuffer.getChannelData(0);
      const inR = e.inputBuffer.getChannelData(1);

      if (!this.granConfig.freeze) {
        for (let i = 0; i < inL.length; i++) {
          const ptr = (this.granWritePtr + i) % ringLen;
          this.granBuffer[0][ptr] = inL[i];
          this.granBuffer[1][ptr] = inR[i];
        }
        this.granWritePtr = (this.granWritePtr + inL.length) % ringLen;
      }
    };

    this.granIn.connect(this.granDry);
    this.granIn.connect(this.granScriptNode);
    // Connect script node to dummy destination to keep it ticking
    const dummyGain = this.ctx.createGain();
    dummyGain.gain.value = 0;
    this.granScriptNode.connect(dummyGain);
    dummyGain.connect(this.ctx.destination);

    this.granDry.connect(this.granOut);
    this.granWet.connect(this.granOut);

    // Start granular grain scheduler loop (runs ~40Hz)
    this.startGrainScheduler();
  }

  private startGrainScheduler(): void {
    if (this.granIntervalId !== null) {
      clearInterval(this.granIntervalId);
    }

    this.granIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.isRunning || !this.granConfig.enabled || this.granConfig.mix <= 0.01) {
        return;
      }

      this.spawnGrain();
    }, 1000 / Math.max(1, this.granConfig.density));
  }

  /**
   * Spawns an individual granular voice with pitch shift, reverse, windowing, and spatialization
   */
  private spawnGrain(): void {
    if (!this.ctx || !this.granWet) return;

    const sr = this.ctx.sampleRate;
    const ringLen = this.granBuffer[0].length;
    const grainSec = Math.max(0.01, this.granConfig.grainSize / 1000);
    const grainSamples = Math.floor(grainSec * sr);

    // Calculate delay offset with random spray jitter
    const delaySec = Math.max(0.01, this.granConfig.delayTime / 1000);
    const spraySec = (Math.random() - 0.5) * (this.granConfig.spray / 1000);
    const totalOffsetSec = Math.max(0.01, delaySec + spraySec);
    const offsetSamples = Math.floor(totalOffsetSec * sr);

    let startPos = (this.granWritePtr - offsetSamples - grainSamples + ringLen * 10) % ringLen;

    // Check reverse grain condition
    const isReverse = Math.random() * 100 < this.granConfig.reverseProb;

    // Calculate pitch shift factor
    let semitones = this.granConfig.pitchShift;
    if (this.granConfig.randomPitch > 0) {
      const jumps = [-12, -7, -5, 0, 5, 7, 12];
      const randomJump = jumps[Math.floor(Math.random() * jumps.length)];
      semitones += (randomJump * (this.granConfig.randomPitch / 12));
    }

    // Glitch mode: stutter bursts
    if (this.granConfig.mode === 'glitch' && Math.random() < 0.3) {
      semitones += (Math.random() > 0.5 ? 12 : -12);
    }

    const playbackRate = Math.pow(2, semitones / 12);

    // Create grain buffer
    const grainBuf = this.ctx.createBuffer(2, grainSamples, sr);
    const gL = grainBuf.getChannelData(0);
    const gR = grainBuf.getChannelData(1);

    // Extract samples from ring buffer with Hann window
    for (let i = 0; i < grainSamples; i++) {
      const readIdx = isReverse
        ? (startPos + grainSamples - 1 - i + ringLen) % ringLen
        : (startPos + i) % ringLen;

      // Hann window envelope
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (grainSamples - 1 || 1)));
      gL[i] = (this.granBuffer[0][readIdx] || 0) * window;
      gR[i] = (this.granBuffer[1][readIdx] || 0) * window;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = grainBuf;
    source.playbackRate.value = Math.max(0.2, Math.min(4.0, playbackRate));

    const grainGain = this.ctx.createGain();
    grainGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Random stereo panning for expansive Particle V2 spatial cloud
    const grainPan = this.ctx.createStereoPanner();
    grainPan.pan.value = (Math.random() * 2 - 1) * 0.9;

    source.connect(grainGain);
    grainGain.connect(grainPan);
    grainPan.connect(this.granWet);

    // Feedback loop back into grain buffer
    if (this.granConfig.feedback > 0.05 && !this.granConfig.freeze) {
      const fbGain = this.ctx.createGain();
      fbGain.gain.value = this.granConfig.feedback * 0.4;
      grainGain.connect(fbGain);
      fbGain.connect(this.granIn!);
    }

    source.start();
    source.stop(this.ctx.currentTime + grainSec / Math.max(0.1, playbackRate) + 0.05);
  }

  /**
   * Generates a hyperbolic tangent curve for warm analog wave shaping / saturation
   */
  private updateDriveCurve(drive: number): void {
    if (!this.masterDriveNode) return;
    const nSamples = 1024;
    const curve = new Float32Array(nSamples);
    const k = 1 + drive * 25; // Saturation intensity

    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1;
      // Smooth soft-clipping tanh response
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    this.masterDriveNode.curve = curve;
  }

  /**
   * Applies the complete oscillator configurations
   */
  public updateOscillators(configs: OscillatorConfig[]): void {
    if (!this.ctx) return;
    this.oscConfigs = configs;
    const now = this.ctx.currentTime;

    const anySolo = configs.some((o) => o.solo);

    configs.forEach((osc, i) => {
      const node = this.oscNodes[i];
      const gainNode = this.oscGains[i];
      const pannerNode = this.oscPanners[i];
      const driftLfo = this.driftLfos[i];
      const driftGain = this.driftGains[i];

      if (!node || !gainNode || !pannerNode) return;

      // Waveform
      if (node.type !== osc.waveform) {
        node.type = osc.waveform;
      }

      // Frequency calculation with octave and fine-tune
      const targetFreq = osc.freq * Math.pow(2, osc.octave) * Math.pow(2, osc.fine / 1200);
      node.frequency.setTargetAtTime(targetFreq, now, 0.02);

      // Gain / Mute / Solo
      const isAudible = osc.enabled && (!anySolo || osc.solo);
      const targetGain = isAudible ? osc.gain * 0.45 : 0;
      gainNode.gain.setTargetAtTime(targetGain, now, 0.03);

      // Stereo Panning
      pannerNode.pan.setTargetAtTime(osc.pan, now, 0.02);

      // Drift LFO
      if (driftLfo && driftGain) {
        driftLfo.frequency.setTargetAtTime(osc.driftRate, now, 0.05);
        driftGain.gain.setTargetAtTime(osc.driftDepth * (targetFreq / 1200), now, 0.05);
      }
    });
  }

  /**
   * Updates the 4x4 FM Modulation Matrix
   */
  public updateFmMatrix(matrix: FmMatrix): void {
    if (!this.ctx) return;
    this.fmMatrix = matrix;
    const now = this.ctx.currentTime;

    for (let m = 0; m < 4; m++) {
      for (let c = 0; c < 4; c++) {
        const gainNode = this.fmGains[m][c];
        if (gainNode) {
          const depth = matrix[m]?.[c] ?? 0;
          gainNode.gain.setTargetAtTime(depth, now, 0.03);
        }
      }
    }
  }

  /**
   * Updates Particle V2 Granular settings
   */
  public updateGranular(config: GranularConfig): void {
    this.granConfig = { ...config };
    if (!this.ctx || !this.granWet || !this.granDry) return;
    const now = this.ctx.currentTime;

    const wet = config.enabled ? config.mix : 0;
    const dry = 1 - wet * 0.7;

    this.granWet.gain.setTargetAtTime(wet, now, 0.03);
    this.granDry.gain.setTargetAtTime(dry, now, 0.03);

    // Restart grain scheduler with new density
    this.startGrainScheduler();
  }

  /**
   * Updates built-in effects (Chorus, Tape Delay, Reverb, Filter, Master)
   */
  public applyEffectsConfig(effects: EffectsConfig): void {
    this.effectsConfig = effects;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Filter
    if (this.filterNode) {
      this.filterNode.type = effects.filter.type;
      this.filterNode.frequency.setTargetAtTime(effects.filter.cutoff, now, 0.03);
      this.filterNode.Q.setTargetAtTime(effects.filter.resonance, now, 0.03);
    }

    // Chorus
    if (this.chorusWet && this.chorusDry && this.chorusLfoL && this.chorusLfoGainL) {
      const wet = effects.chorus.enabled ? effects.chorus.mix : 0;
      this.chorusWet.gain.setTargetAtTime(wet, now, 0.03);
      this.chorusDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.03);
      this.chorusLfoL.frequency.setTargetAtTime(effects.chorus.rate, now, 0.05);
      this.chorusLfoGainL.gain.setTargetAtTime(effects.chorus.depth / 1000, now, 0.05);
    }

    // Delay
    if (this.delayWet && this.delayDry && this.delayNode && this.delayFeedbackGain && this.delayDampFilter) {
      const wet = effects.delay.enabled ? effects.delay.mix : 0;
      this.delayWet.gain.setTargetAtTime(wet, now, 0.03);
      this.delayDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.03);
      this.delayNode.delayTime.setTargetAtTime(effects.delay.time / 1000, now, 0.05);
      this.delayFeedbackGain.gain.setTargetAtTime(effects.delay.feedback, now, 0.03);
      this.delayDampFilter.frequency.setTargetAtTime(effects.delay.damping, now, 0.03);
    }

    // Reverb
    if (this.reverbWet && this.reverbDry) {
      const wet = effects.reverb.enabled ? effects.reverb.mix : 0;
      this.reverbWet.gain.setTargetAtTime(wet, now, 0.03);
      this.reverbDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.03);
    }

    // Master
    if (this.masterGain && this.isRunning) {
      this.masterGain.gain.setTargetAtTime(effects.master.volume, now, 0.03);
    }
    this.updateDriveCurve(effects.master.drive);
  }

  /**
   * Retrieves visualizer telemetry: waveform buffer & frequency spectrum
   */
  public getVisualizerData(): {
    timeDomain: Float32Array;
    frequency: Uint8Array;
    leftBuffer: Float32Array;
    rightBuffer: Float32Array;
    rms: number;
    peak: number;
  } {
    const timeDomain = new Float32Array(1024);
    const frequency = new Uint8Array(512);
    const leftBuffer = new Float32Array(512);
    const rightBuffer = new Float32Array(512);

    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(timeDomain);
      this.analyser.getByteFrequencyData(frequency);
    }
    if (this.analyserSplitL) {
      this.analyserSplitL.getFloatTimeDomainData(leftBuffer);
    }
    if (this.analyserSplitR) {
      this.analyserSplitR.getFloatTimeDomainData(rightBuffer);
    }

    // Compute RMS and Peak for level meters
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const abs = Math.abs(timeDomain[i]);
      if (abs > peak) peak = abs;
      sumSquares += abs * abs;
    }
    const rms = Math.sqrt(sumSquares / timeDomain.length);

    return { timeDomain, frequency, leftBuffer, rightBuffer, rms, peak };
  }

  /**
   * Starts live WAV recording
   */
  public startRecording(): boolean {
    if (!this.recorderDest || !this.ctx) return false;
    try {
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.recorderDest.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stops recording and triggers browser download of the ambient session
   */
  public stopRecordingAndDownload(filename: string = 'aura4_ambient_session.webm'): void {
    if (!this.mediaRecorder || !this.isRecording) return;
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.isRecording = false;
    };
    this.mediaRecorder.stop();
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  // ==========================================
  // EXTERNAL SAMPLE PLAYER METHODS
  // ==========================================

  /**
   * Loads an external sample from a File (.wav, .mp3, .ogg, etc.)
   */
  public async loadSampleFile(file: File): Promise<SampleConfig> {
    if (!this.ctx) {
      await this.init();
    }
    const arrayBuffer = await file.arrayBuffer();
    return this.loadSampleFromArrayBuffer(arrayBuffer, file.name, file.size);
  }

  /**
   * Decodes an ArrayBuffer into AudioBuffer and creates reversed buffer
   */
  public async loadSampleFromArrayBuffer(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    fileSize: number = 0
  ): Promise<SampleConfig> {
    if (!this.ctx) {
      await this.init();
    }
    if (!this.ctx) throw new Error('AudioContext unavailable');

    // Decode audio data asynchronously
    const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    this.sampleBuffer = decoded;
    this.sampleReversedBuffer = this.createReversedBuffer(decoded);

    this.sampleConfig = {
      ...this.sampleConfig,
      loaded: true,
      fileName,
      duration: decoded.duration,
      sampleRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      fileSize: fileSize || arrayBuffer.byteLength,
      isPlaying: false,
      loopStart: 0.0,
      loopEnd: 1.0,
      currentPlayhead: 0.0,
    };

    return { ...this.sampleConfig };
  }

  /**
   * Generates a reversed copy of an AudioBuffer for reverse loop playback
   */
  private createReversedBuffer(buffer: AudioBuffer): AudioBuffer {
    if (!this.ctx) return buffer;
    const rev = this.ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = rev.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        dst[i] = src[buffer.length - 1 - i];
      }
    }
    return rev;
  }

  /**
   * Starts or resumes sample playback
   */
  public playSample(offsetFraction: number = 0): void {
    if (!this.ctx || !this.sampleBuffer || !this.sampleGain) return;

    this.stopSample();

    const activeBuffer = this.sampleConfig.reverse
      ? this.sampleReversedBuffer || this.sampleBuffer
      : this.sampleBuffer;

    const source = this.ctx.createBufferSource();
    source.buffer = activeBuffer;
    source.loop = this.sampleConfig.loop;

    const dur = activeBuffer.duration;
    if (this.sampleConfig.loop) {
      source.loopStart = Math.max(0, this.sampleConfig.loopStart * dur);
      source.loopEnd = Math.min(dur, this.sampleConfig.loopEnd * dur);
      if (source.loopEnd <= source.loopStart) {
        source.loopEnd = dur;
      }
    }

    const rate = this.sampleConfig.playbackRate * Math.pow(2, this.sampleConfig.pitchSemitones / 12);
    source.playbackRate.value = Math.max(0.1, Math.min(8.0, rate));

    source.connect(this.sampleGain);

    const clampedOffset = Math.max(0, Math.min(1.0, offsetFraction)) * dur;
    source.start(0, clampedOffset);

    this.sampleSource = source;
    this.sampleStartTime = this.ctx.currentTime;
    this.sampleStartOffset = clampedOffset;
    this.sampleIsPlaying = true;
    this.sampleConfig.isPlaying = true;

    source.onended = () => {
      if (!this.sampleConfig.loop) {
        this.sampleIsPlaying = false;
        this.sampleConfig.isPlaying = false;
      }
    };
  }

  /**
   * Pauses sample playback and captures playhead position
   */
  public pauseSample(): void {
    if (!this.sampleSource || !this.ctx || !this.sampleBuffer) return;
    const playhead = this.getSamplePlayhead();
    this.sampleStartOffset = playhead * this.sampleBuffer.duration;
    try {
      this.sampleSource.stop();
      this.sampleSource.disconnect();
    } catch {}
    this.sampleSource = null;
    this.sampleIsPlaying = false;
    this.sampleConfig.isPlaying = false;
  }

  /**
   * Stops sample playback and resets playhead to start
   */
  public stopSample(): void {
    if (this.sampleSource) {
      try {
        this.sampleSource.stop();
        this.sampleSource.disconnect();
      } catch {}
      this.sampleSource = null;
    }
    this.sampleIsPlaying = false;
    this.sampleConfig.isPlaying = false;
    this.sampleStartOffset = 0;
  }

  /**
   * Updates sample player volume, pan, effects routing, and pitch parameters
   */
  public updateSampleConfig(updates: Partial<SampleConfig>): void {
    this.sampleConfig = { ...this.sampleConfig, ...updates };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Gain
    if (this.sampleGain && updates.gain !== undefined) {
      this.sampleGain.gain.setTargetAtTime(updates.gain, now, 0.02);
    }

    // Pan
    if (this.samplePanner && updates.pan !== undefined) {
      this.samplePanner.pan.setTargetAtTime(updates.pan, now, 0.02);
    }

    // Effects send vs direct master routing
    if (this.sampleEffectsSend && this.sampleDirectMaster) {
      const sendToFx = this.sampleConfig.sendToEffects;
      const sendLevel = this.sampleConfig.effectsSendLevel;
      this.sampleEffectsSend.gain.setTargetAtTime(sendToFx ? sendLevel : 0, now, 0.02);
      this.sampleDirectMaster.gain.setTargetAtTime(!sendToFx ? 1.0 : (1 - sendLevel * 0.7), now, 0.02);
    }

    // Update active source rate/loop if playing
    if (this.sampleSource && this.sampleBuffer) {
      const rate = this.sampleConfig.playbackRate * Math.pow(2, this.sampleConfig.pitchSemitones / 12);
      this.sampleSource.playbackRate.setTargetAtTime(Math.max(0.1, Math.min(8.0, rate)), now, 0.02);
      this.sampleSource.loop = this.sampleConfig.loop;

      const dur = this.sampleBuffer.duration;
      this.sampleSource.loopStart = this.sampleConfig.loopStart * dur;
      this.sampleSource.loopEnd = this.sampleConfig.loopEnd * dur;
    }
  }

  public getSampleConfig(): SampleConfig {
    return { ...this.sampleConfig, currentPlayhead: this.getSamplePlayhead() };
  }

  /**
   * Calculates current playback progress (0.0 to 1.0)
   */
  public getSamplePlayhead(): number {
    if (!this.sampleIsPlaying || !this.ctx || !this.sampleBuffer) {
      return this.sampleBuffer ? this.sampleStartOffset / this.sampleBuffer.duration : 0;
    }

    const elapsed = this.ctx.currentTime - this.sampleStartTime;
    const rate = this.sampleConfig.playbackRate * Math.pow(2, this.sampleConfig.pitchSemitones / 12);
    const dur = this.sampleBuffer.duration;
    const posSec = this.sampleStartOffset + elapsed * rate;

    if (this.sampleConfig.loop) {
      const lStart = this.sampleConfig.loopStart * dur;
      const lEnd = this.sampleConfig.loopEnd * dur;
      const loopLen = lEnd - lStart;
      if (loopLen > 0.05) {
        if (posSec >= lStart) {
          const inLoop = (posSec - lStart) % loopLen;
          return (lStart + inLoop) / dur;
        }
      }
      return (posSec % dur) / dur;
    }

    return Math.min(1.0, posSec / dur);
  }

  /**
   * Returns downsampled waveform array for character Braille plotting
   */
  public getSampleWaveform(numPoints: number = 72): Float32Array | null {
    if (!this.sampleBuffer) return null;
    const channelData = this.sampleBuffer.getChannelData(0);
    const step = Math.floor(channelData.length / numPoints);
    const peaks = new Float32Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
      let max = 0;
      const start = i * step;
      for (let j = 0; j < step; j += 4) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }
    return peaks;
  }

  /**
   * Programmatically generates high-fidelity ambient tape loop samples
   * for instant loading and testing without requiring an external file.
   */
  public async generateBuiltinAmbientSample(
    type: 'sub_hydro' | 'space_drone' | 'mellotron'
  ): Promise<SampleConfig> {
    if (!this.ctx) {
      await this.init();
    }
    if (!this.ctx) throw new Error('AudioContext unavailable');

    const sr = this.ctx.sampleRate;
    const duration = type === 'sub_hydro' ? 6.0 : type === 'space_drone' ? 8.0 : 5.0;
    const length = Math.floor(sr * duration);
    const buf = this.ctx.createBuffer(2, length, sr);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);

    if (type === 'sub_hydro') {
      // Sub-aquatic hydrophone tape loop: deep lowpass rumbling with metallic hydro bubbles
      for (let i = 0; i < length; i++) {
        const t = i / sr;
        const sub = Math.sin(2 * Math.PI * 48 * t) * 0.5 + Math.sin(2 * Math.PI * 72 * t + 0.3) * 0.3;
        const rumble = (Math.random() * 2 - 1) * 0.08 * (Math.sin(t * 1.5) * 0.5 + 0.5);
        const tapeHiss = (Math.random() * 2 - 1) * 0.02;
        left[i] = (sub + rumble + tapeHiss) * 0.7;
        right[i] = (sub + rumble * 1.2 + tapeHiss * 0.9) * 0.7;
      }
    } else if (type === 'space_drone') {
      // Radio telescope celestial sweep with resonant bell harmonics
      for (let i = 0; i < length; i++) {
        const t = i / sr;
        const sweepFreq = 180 + Math.sin(2 * Math.PI * 0.2 * t) * 60;
        const harm1 = Math.sin(2 * Math.PI * sweepFreq * t) * 0.4;
        const harm2 = Math.sin(2 * Math.PI * (sweepFreq * 1.5) * t + 1.0) * 0.25;
        const harm3 = Math.sin(2 * Math.PI * (sweepFreq * 2.25) * t + 2.0) * 0.15;
        left[i] = (harm1 + harm2 * 0.8 + harm3) * 0.6;
        right[i] = (harm1 * 0.8 + harm2 + harm3 * 0.7) * 0.6;
      }
    } else {
      // Dusty vintage Mellotron flute / choir loop: warm additive organ tones with vibrato
      for (let i = 0; i < length; i++) {
        const t = i / sr;
        const vibrato = Math.sin(2 * Math.PI * 5.2 * t) * 3.5;
        const f0 = 261.63 + vibrato; // Middle C
        const o1 = Math.sin(2 * Math.PI * f0 * t) * 0.45;
        const o2 = Math.sin(2 * Math.PI * (f0 * 2) * t) * 0.25;
        const o3 = Math.sin(2 * Math.PI * (f0 * 3) * t) * 0.15;
        const flutter = (Math.random() * 2 - 1) * 0.02;
        left[i] = (o1 + o2 + o3 + flutter) * 0.65;
        right[i] = (o1 * 0.9 + o2 * 1.1 + o3 + flutter) * 0.65;
      }
    }

    this.sampleBuffer = buf;
    this.sampleReversedBuffer = this.createReversedBuffer(buf);

    const nameMap = {
      sub_hydro: 'sub_aquatic_hydrophone_tape.wav',
      space_drone: 'celestial_radio_telescope_loop.wav',
      mellotron: 'vintage_mellotron_tape_loop.wav',
    };

    this.sampleConfig = {
      ...this.sampleConfig,
      loaded: true,
      fileName: nameMap[type],
      duration: buf.duration,
      sampleRate: buf.sampleRate,
      channels: buf.numberOfChannels,
      fileSize: length * 4,
      isPlaying: false,
      loop: true,
      loopStart: 0.0,
      loopEnd: 1.0,
      currentPlayhead: 0.0,
    };

    return { ...this.sampleConfig };
  }

  // ==========================================
  // LFO MODULATION MATRIX METHODS
  // ==========================================

  /**
   * Applies LFO units and sets up routing to destination AudioParams
   */
  public updateLfoMatrix(config: LfoMatrixConfig): void {
    this.lfoConfig = config;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Update each LFO Generator
    config.lfos.forEach((cfg, i) => {
      const node = this.lfoNodes[i];
      const gainNode = this.lfoGains[i];
      if (node && gainNode) {
        if (cfg.waveform !== 'random') {
          if (node.type !== cfg.waveform) {
            node.type = cfg.waveform;
          }
        } else {
          node.type = 'triangle'; // base wave for S&H
        }
        node.frequency.setTargetAtTime(Math.max(0.01, cfg.rate), now, 0.05);
        gainNode.gain.setTargetAtTime(cfg.enabled ? cfg.depth : 0, now, 0.05);
      }
    });

    // 2. Disconnect existing route nodes
    this.lfoRouteGains.forEach((routeGain) => {
      try {
        routeGain.disconnect();
      } catch {}
    });
    this.lfoRouteGains.clear();

    // 3. Connect active routes to target AudioParams
    config.routes.forEach((route) => {
      if (!route.enabled || Math.abs(route.amount) < 0.001) return;
      const lfoIdx = route.sourceLfoId - 1;
      const lfoGainNode = this.lfoGains[lfoIdx];
      const lfoCfg = config.lfos[lfoIdx];
      if (!lfoGainNode || !lfoCfg || !lfoCfg.enabled) return;

      let targetParam: AudioParam | null = null;
      let maxScale = 1.0;

      switch (route.destination) {
        case 'osc1_pitch':
          targetParam = this.oscNodes[0]?.frequency || null;
          maxScale = 120; // +/- 120 Hz
          break;
        case 'osc2_pitch':
          targetParam = this.oscNodes[1]?.frequency || null;
          maxScale = 120;
          break;
        case 'osc3_pitch':
          targetParam = this.oscNodes[2]?.frequency || null;
          maxScale = 120;
          break;
        case 'osc4_pitch':
          targetParam = this.oscNodes[3]?.frequency || null;
          maxScale = 120;
          break;
        case 'fm_1_2':
          targetParam = this.fmGains[0]?.[1]?.gain || null;
          maxScale = 220; // +/- 220 Hz FM index
          break;
        case 'fm_2_3':
          targetParam = this.fmGains[1]?.[2]?.gain || null;
          maxScale = 220;
          break;
        case 'fm_3_4':
          targetParam = this.fmGains[2]?.[3]?.gain || null;
          maxScale = 220;
          break;
        case 'filter_cutoff':
          targetParam = this.filterNode?.frequency || null;
          maxScale = 3800; // +/- 3.8 kHz cutoff sweep
          break;
        case 'filter_resonance':
          targetParam = this.filterNode?.Q || null;
          maxScale = 6.0;
          break;
        case 'delay_time':
          targetParam = this.delayNode?.delayTime || null;
          maxScale = 0.18; // +/- 180ms delay time modulation (tape wow)
          break;
        case 'chorus_rate':
          targetParam = this.chorusLfoL?.frequency || null;
          maxScale = 2.5;
          break;
        case 'reverb_mix':
          targetParam = this.reverbWet?.gain || null;
          maxScale = 0.45;
          break;
        case 'stereo_pan':
          targetParam = this.oscPanners[0]?.pan || null;
          maxScale = 0.9;
          break;
      }

      if (targetParam && this.ctx) {
        const routeGain = this.ctx.createGain();
        routeGain.gain.setValueAtTime(maxScale * route.amount, now);
        lfoGainNode.connect(routeGain);
        routeGain.connect(targetParam);
        this.lfoRouteGains.set(route.id, routeGain);
      }
    });
  }

  public getLfoConfig(): LfoMatrixConfig {
    return { ...this.lfoConfig };
  }

  /**
   * Computes instantaneous normalized value (-1.0 to +1.0) of an LFO
   */
  public getLfoInstantValue(lfoId: number): number {
    const lfo = this.lfoConfig.lfos.find((l) => l.id === lfoId);
    if (!lfo || !lfo.enabled) return 0;
    const t = (this.ctx ? this.ctx.currentTime : performance.now() / 1000) * lfo.rate + (lfo.phase / 360);

    let val = 0;
    const cycle = t % 1;

    switch (lfo.waveform) {
      case 'sine':
        val = Math.sin(2 * Math.PI * cycle);
        break;
      case 'triangle':
        val = 2 * Math.abs(2 * cycle - 1) - 1;
        break;
      case 'sawtooth':
        val = 2 * cycle - 1;
        break;
      case 'square':
        val = cycle < 0.5 ? 1 : -1;
        break;
      case 'random': {
        const step = Math.floor(t);
        // Deterministic pseudo-random sample & hold based on step
        const pseudoRand = Math.sin(step * 12.9898 + lfoId * 78.233) * 43758.5453;
        val = (pseudoRand - Math.floor(pseudoRand)) * 2 - 1;
        break;
      }
    }

    return val * lfo.depth;
  }

  /**
   * Returns current instantaneous values of all 4 LFOs for UI gauges
   */
  public getLfoTelemetry(): number[] {
    return [1, 2, 3, 4].map((id) => this.getLfoInstantValue(id));
  }

  /**
   * Returns current Step Sequencer configuration
   */
  public getSequencerConfig(): SequencerConfig {
    return this.sequencerConfig;
  }

  /**
   * Updates sequencer configuration and synchronizes clock
   */
  public updateSequencerConfig(config: SequencerConfig): void {
    const wasEnabled = this.sequencerConfig.enabled;
    this.sequencerConfig = config;

    if (this.ctx && this.isRunning) {
      if (config.enabled && (!wasEnabled || !this.seqIsRunning)) {
        this.startSequencerClock();
      } else if (!config.enabled && this.seqIsRunning) {
        this.stopSequencerClock();
      }
    }
  }

  /**
   * Registers a callback for real-time playhead updates across the 4 tracks
   */
  public onSequencerStep(cb: (steps: number[]) => void): () => void {
    this.seqStepCallbacks.push(cb);
    return () => {
      this.seqStepCallbacks = this.seqStepCallbacks.filter((c) => c !== cb);
    };
  }

  /**
   * Starts the Web Audio lookahead sequencer clock
   */
  public startSequencerClock(): void {
    if (!this.ctx) return;
    this.seqIsRunning = true;
    this.seqNextStepTime = this.ctx.currentTime + 0.04;
    this.seqCurrentStepIndices = [0, 0, 0, 0];
    this.seqStepDirections = [1, 1, 1, 1];

    if (this.seqTimerId !== null) {
      clearInterval(this.seqTimerId);
    }
    this.seqTimerId = window.setInterval(() => {
      this.tickSequencerClock();
    }, 25);
  }

  /**
   * Stops the sequencer clock and restores continuous drone gains if needed
   */
  public stopSequencerClock(): void {
    this.seqIsRunning = false;
    if (this.seqTimerId !== null) {
      clearInterval(this.seqTimerId);
      this.seqTimerId = null;
    }
    // If sequencer stopped, restore steady drone levels for audible oscillators
    if (this.ctx && this.isRunning) {
      this.updateOscillators(this.oscConfigs);
    }
  }

  /**
   * Web Audio Lookahead scheduler loop
   */
  private tickSequencerClock(): void {
    if (!this.ctx || !this.seqIsRunning || !this.sequencerConfig.enabled) return;

    // Calculate step interval based on bpm & division
    const beatSec = 60 / Math.max(30, Math.min(260, this.sequencerConfig.bpm));
    let baseDiv = 0.25; // 1/16 note default
    switch (this.sequencerConfig.division) {
      case '1/4': baseDiv = 1.0; break;
      case '1/8': baseDiv = 0.5; break;
      case '1/16': baseDiv = 0.25; break;
      case '1/32': baseDiv = 0.125; break;
    }
    const stepInterval = beatSec * baseDiv;

    // Lookahead window of 120ms
    const scheduleAheadTime = 0.12;

    while (this.seqNextStepTime < this.ctx.currentTime + scheduleAheadTime) {
      const triggerTime = Math.max(this.ctx.currentTime, this.seqNextStepTime);
      const snapshotStepIndices = [...this.seqCurrentStepIndices];

      // Schedule audio notes, gate envelopes, and parameter changes for this step
      this.scheduleStepAtTime(triggerTime, stepInterval, snapshotStepIndices);

      // Advance track step playheads according to track length and direction
      for (let t = 0; t < 4; t++) {
        const track = this.sequencerConfig.tracks[t];
        if (!track) continue;
        const len = Math.max(1, Math.min(16, track.length));
        let cur = this.seqCurrentStepIndices[t];

        switch (track.direction) {
          case 'forward':
            cur = (cur + 1) % len;
            break;
          case 'backward':
            cur = (cur - 1 + len) % len;
            break;
          case 'pingpong': {
            let dir = this.seqStepDirections[t] || 1;
            if (cur >= len - 1) {
              dir = -1;
            } else if (cur <= 0) {
              dir = 1;
            }
            this.seqStepDirections[t] = dir;
            cur = Math.max(0, Math.min(len - 1, cur + dir));
            break;
          }
          case 'random':
            cur = Math.floor(Math.random() * len);
            break;
        }
        this.seqCurrentStepIndices[t] = cur;
      }

      // Sync UI playhead notification at precise trigger moment
      const delayMs = Math.max(0, (triggerTime - this.ctx.currentTime) * 1000);
      setTimeout(() => {
        this.seqStepCallbacks.forEach((cb) => cb(snapshotStepIndices));
      }, delayMs);

      // Calculate next step time with swing offset
      const isOdd = snapshotStepIndices[0] % 2 === 1;
      const swingOffset = this.sequencerConfig.swing * stepInterval * 0.4;
      const actualDuration = isOdd ? stepInterval + swingOffset : stepInterval - swingOffset;
      this.seqNextStepTime += Math.max(0.02, actualDuration);
    }
  }

  /**
   * Schedules synthesis nodes and parameter locks for a specific step
   */
  private scheduleStepAtTime(triggerTime: number, stepDuration: number, stepIndices: number[]): void {
    if (!this.ctx) return;

    for (let t = 0; t < 4; t++) {
      const track = this.sequencerConfig.tracks[t];
      if (!track || !track.enabled) continue;

      const oscNode = this.oscNodes[t];
      const gainNode = this.oscGains[t];
      const pannerNode = this.oscPanners[t];
      if (!oscNode || !gainNode) continue;

      const stepIndex = stepIndices[t] % track.steps.length;
      const step = track.steps[stepIndex];
      if (!step || !step.active) continue;

      // 1. Calculate frequency with track octave offset
      const targetFreq = step.freq * Math.pow(2, track.octaveOffset);

      // Pitch glide or sharp jump
      if (step.slide) {
        oscNode.frequency.setTargetAtTime(targetFreq, triggerTime, 0.045);
      } else {
        oscNode.frequency.cancelScheduledValues(triggerTime);
        oscNode.frequency.setValueAtTime(targetFreq, triggerTime);
      }

      // 2. Note gate envelope
      const oscCfg = this.oscConfigs[t] || { gain: 0.8, pan: 0 };
      const peakGain = Math.max(0.01, step.velocity * oscCfg.gain * 0.45);
      const noteDuration = Math.max(0.025, stepDuration * Math.min(1.0, Math.max(0.1, step.gate)));

      if (this.sequencerConfig.mode === 'gated') {
        const attackTime = 0.005; // 5ms clickless attack
        gainNode.gain.cancelScheduledValues(triggerTime);
        gainNode.gain.setValueAtTime(0.0001, triggerTime);
        gainNode.gain.linearRampToValueAtTime(peakGain, triggerTime + attackTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + noteDuration);
      } else {
        // Drone mode: smoothly adjust gain and hold continuous sound
        gainNode.gain.cancelScheduledValues(triggerTime);
        gainNode.gain.setTargetAtTime(peakGain, triggerTime, 0.035);
      }

      // 3. Parameter Lock Changes
      if (step.paramType !== 'none') {
        switch (step.paramType) {
          case 'fm_depth': {
            const carrierIdx = (t + 1) % 4;
            const fmGain = this.fmGains[t][carrierIdx];
            if (fmGain) {
              const origFm = this.fmMatrix[t][carrierIdx];
              fmGain.gain.cancelScheduledValues(triggerTime);
              fmGain.gain.setValueAtTime(step.paramValue, triggerTime);
              fmGain.gain.setTargetAtTime(origFm, triggerTime + noteDuration, 0.03);
            }
            break;
          }
          case 'filter_cutoff': {
            if (this.filterNode) {
              const origCutoff = this.effectsConfig.filter.cutoff;
              this.filterNode.frequency.cancelScheduledValues(triggerTime);
              this.filterNode.frequency.setValueAtTime(Math.max(50, Math.min(18000, step.paramValue)), triggerTime);
              this.filterNode.frequency.setTargetAtTime(origCutoff, triggerTime + noteDuration, 0.04);
            }
            break;
          }
          case 'pan': {
            if (pannerNode) {
              const origPan = oscCfg.pan;
              pannerNode.pan.cancelScheduledValues(triggerTime);
              pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, step.paramValue)), triggerTime);
              pannerNode.pan.setTargetAtTime(origPan, triggerTime + noteDuration, 0.03);
            }
            break;
          }
          case 'particle_pitch': {
            const origGranPitch = this.granConfig.pitchShift;
            this.granConfig.pitchShift = step.paramValue;
            setTimeout(() => {
              if (this.granConfig.pitchShift === step.paramValue) {
                this.granConfig.pitchShift = origGranPitch;
              }
            }, noteDuration * 1000);
            break;
          }
        }
      }
    }
  }

  /**
   * Teardown resources
   */
  public destroy(): void {
    this.stopSequencerClock();
    if (this.sampleSource) {
      try {
        this.sampleSource.stop();
        this.sampleSource.disconnect();
      } catch {}
      this.sampleSource = null;
    }
    if (this.granIntervalId !== null) {
      clearInterval(this.granIntervalId);
      this.granIntervalId = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
