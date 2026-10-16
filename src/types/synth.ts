export type WaveformType = 'sine' | 'sawtooth' | 'triangle' | 'square';

export interface OscillatorConfig {
  id: number;
  name: string;
  waveform: WaveformType;
  enabled: boolean;
  solo: boolean;
  freq: number;       // Base frequency in Hz (20 - 2000)
  fine: number;       // Fine tuning in cents (-100 to +100)
  octave: number;     // Octave offset (-3 to +3)
  gain: number;       // Gain (0.0 to 1.0)
  pan: number;        // Stereo Pan (-1.0 to 1.0)
  warmth: number;     // Analog warmth / soft saturation (0.0 to 1.0)
  driftRate: number;  // Drift LFO rate (0.05 to 5.0 Hz)
  driftDepth: number; // Drift LFO depth in cents (0.0 to 30.0)
}

export type FmMatrix = number[][]; // 4x4 matrix: [modulatorIndex][carrierIndex] in Hz (0 to 1000)

export type ParticleMode = 'pitch' | 'reverse' | 'glitch' | 'stutter' | 'density';

export interface GranularConfig {
  enabled: boolean;
  mode: ParticleMode;
  grainSize: number;     // Grain size in ms (10 - 500)
  density: number;       // Grains per second / overlap (1 - 25)
  pitchShift: number;    // Semitones (-12 to +12)
  randomPitch: number;   // Max random pitch offset in semitones (0 - 12)
  feedback: number;      // Feedback amount (0.0 - 0.95)
  delayTime: number;     // Delay buffer time in ms (20 - 2000)
  spray: number;         // Random timing jitter in ms (0 - 200)
  reverseProb: number;   // Reverse grain probability (0 - 100%)
  freeze: boolean;       // Freeze buffer
  mix: number;           // Dry/Wet (0.0 - 1.0)
}

export interface EffectsConfig {
  filter: {
    enabled: boolean;
    cutoff: number;      // 50 to 18000 Hz
    resonance: number;   // 0.5 to 15 Q
    type: 'lowpass' | 'bandpass' | 'highpass';
  };
  chorus: {
    enabled: boolean;
    rate: number;        // 0.1 to 8 Hz
    depth: number;       // 1 to 15 ms
    mix: number;         // 0 to 1
  };
  delay: {
    enabled: boolean;
    time: number;        // 50 to 1500 ms
    feedback: number;    // 0 to 0.9
    damping: number;     // 500 to 12000 Hz
    wowFlutter: number;  // 0 to 1
    mix: number;         // 0 to 1
  };
  reverb: {
    enabled: boolean;
    decay: number;       // 0.5 to 10 seconds
    damping: number;     // 1000 to 16000 Hz
    mix: number;         // 0 to 1
  };
  master: {
    volume: number;      // 0 to 1
    drive: number;       // 0 to 1 (analog saturation)
  };
}

export type ColorTheme = 'amber' | 'green' | 'cyan' | 'matrix' | 'slate' | 'crimson';

export interface SampleConfig {
  loaded: boolean;
  fileName: string;
  duration: number;
  sampleRate: number;
  channels: number;
  fileSize: number;
  isPlaying: boolean;
  loop: boolean;
  loopStart: number;       // 0.0 to 1.0
  loopEnd: number;         // 0.0 to 1.0
  playbackRate: number;    // 0.25 to 4.0
  pitchSemitones: number;  // -24 to +24
  reverse: boolean;
  gain: number;            // 0.0 to 1.5
  pan: number;             // -1.0 to 1.0
  sendToEffects: boolean;  // send through Filter/Chorus/Particle/Reverb rack
  effectsSendLevel: number;// 0.0 to 1.0
  currentPlayhead: number; // 0.0 to 1.0
}

export type LfoWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'random';

export interface LfoUnitConfig {
  id: number;
  name: string;
  enabled: boolean;
  waveform: LfoWaveform;
  rate: number;         // 0.02 to 20.0 Hz
  depth: number;        // 0.0 to 1.0
  phase: number;        // 0 to 360 degrees
}

export type ModulationDestination =
  | 'osc1_pitch'
  | 'osc2_pitch'
  | 'osc3_pitch'
  | 'osc4_pitch'
  | 'fm_1_2'
  | 'fm_2_3'
  | 'fm_3_4'
  | 'filter_cutoff'
  | 'filter_resonance'
  | 'particle_size'
  | 'particle_pitch'
  | 'delay_time'
  | 'chorus_rate'
  | 'reverb_mix'
  | 'stereo_pan';

export interface ModulationRoute {
  id: string;
  sourceLfoId: number;  // 1, 2, 3, 4
  destination: ModulationDestination;
  amount: number;       // -1.0 to +1.0
  enabled: boolean;
}

export interface LfoMatrixConfig {
  lfos: LfoUnitConfig[];
  routes: ModulationRoute[];
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: 'ambient' | 'experimental' | 'drone' | 'glitch' | 'space';
  oscillators: OscillatorConfig[];
  fmMatrix: FmMatrix;
  granular: GranularConfig;
  effects: EffectsConfig;
  lfoMatrix?: LfoMatrixConfig;
  sequencer?: SequencerConfig;
}

export type StepParamType = 'none' | 'fm_depth' | 'filter_cutoff' | 'pan' | 'particle_pitch';

export interface StepConfig {
  active: boolean;
  note: string;         // e.g. 'C3', 'E3', 'G3'
  midi: number;         // MIDI note number (60 = C4)
  freq: number;         // Computed frequency in Hz
  velocity: number;     // 0.0 to 1.0
  gate: number;         // 0.1 to 1.0 (duration fraction of step)
  slide: boolean;       // glide into this note
  paramType: StepParamType;
  paramValue: number;   // Value for parameter lock (e.g. FM depth Hz, filter cutoff Hz, etc.)
}

export type SequencerDirection = 'forward' | 'backward' | 'pingpong' | 'random';

export interface TrackConfig {
  id: number;           // 0, 1, 2, 3 for Osc 1, 2, 3, 4
  name: string;
  waveform: WaveformType;
  enabled: boolean;
  solo: boolean;
  octaveOffset: number; // -2 to +2
  length: number;       // 1 to 16
  direction: SequencerDirection;
  currentStep: number;  // Live playhead step
  steps: StepConfig[];
}

export type ClockDivision = '1/4' | '1/8' | '1/16' | '1/32';

export interface SequencerConfig {
  enabled: boolean;
  bpm: number;          // 30 to 240
  division: ClockDivision;
  swing: number;        // 0.0 to 0.75
  mode: 'gated' | 'drone'; // 'gated' triggers envelopes; 'drone' continually drones while shifting pitch & params
  tracks: TrackConfig[];
}

export interface VisualizerData {
  timeDomain: Float32Array;
  frequency: Uint8Array;
  rms: number;
  peak: number;
}
