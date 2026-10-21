// SPDX-License-Identifier: GPL-3.0-or-later
import { SequencerConfig, TrackConfig, StepConfig } from '../types/synth';

// Note names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts MIDI note number (e.g. 60 = C4) to Frequency in Hz
 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converts MIDI note number to Note Name (e.g. 60 -> "C4")
 */
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Converts Note Name (e.g. "C4", "F#3") to MIDI number
 */
export function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60;
  const note = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) return 60;
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Generates an empty track with 16 steps
 */
export function createDefaultTrack(
  id: number,
  name: string,
  waveform: 'sine' | 'sawtooth' | 'triangle' | 'square',
  baseMidi: number
): TrackConfig {
  const steps: StepConfig[] = Array.from({ length: 16 }, (_, i) => {
    // Some musical default patterns
    const defaultMidi = baseMidi;
    return {
      active: i % 4 === 0, // default quarter note triggers
      note: midiToNoteName(defaultMidi),
      midi: defaultMidi,
      freq: midiToFreq(defaultMidi),
      velocity: 0.8,
      gate: 0.75,
      slide: false,
      paramType: 'none',
      paramValue: 0,
    };
  });

  return {
    id,
    name,
    waveform,
    enabled: true,
    solo: false,
    octaveOffset: 0,
    length: 16,
    direction: 'forward',
    currentStep: 0,
    steps,
  };
}

/**
 * Scale definition for rapid step quantizing
 */
export interface ScaleDefinition {
  name: string;
  intervals: number[]; // semitones relative to root
}

export const SEQUENCER_SCALES: ScaleDefinition[] = [
  { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { name: 'Dorian Ambient', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'Aeolian Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'Lydian Ethereal', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { name: 'Whole Tone Mystic', intervals: [0, 2, 4, 6, 8, 10] },
  { name: 'Sub-Bass Root & 5th', intervals: [0, 7] },
];

/**
 * Initial Default Sequencer Configuration
 */
export function getDefaultSequencerConfig(): SequencerConfig {
  // Track 1: Sub Bass Sine (C2 octave: MIDI 36)
  const track1 = createDefaultTrack(0, 'OSC 1 [SINE: SUB-BASS]', 'sine', 36);
  // Custom bassline: C2, C2, Eb2, G1, C2, F2, Eb2, G2
  const bassNotes = [36, 36, 39, 31, 36, 41, 39, 43, 36, 36, 39, 41, 36, 34, 39, 36];
  const bassActives = [true, false, true, false, true, false, true, true, true, false, true, false, true, true, false, true];
  track1.steps = track1.steps.map((st, i) => {
    const m = bassNotes[i % bassNotes.length];
    return {
      ...st,
      active: bassActives[i],
      note: midiToNoteName(m),
      midi: m,
      freq: midiToFreq(m),
      velocity: i % 4 === 0 ? 0.95 : 0.7,
      gate: 0.8,
      slide: i === 6 || i === 13,
      paramType: i === 7 ? 'filter_cutoff' : 'none',
      paramValue: i === 7 ? 2400 : 0,
    };
  });

  // Track 2: Sawtooth Arp (C3 - C4 octave: MIDI 48 - 60)
  const track2 = createDefaultTrack(1, 'OSC 2 [SAW: ARP OSTINATO]', 'sawtooth', 48);
  const arpNotes = [48, 51, 55, 58, 60, 58, 55, 51, 48, 55, 58, 63, 60, 58, 55, 53];
  track2.steps = track2.steps.map((st, i) => {
    const m = arpNotes[i % arpNotes.length];
    return {
      ...st,
      active: true, // running 16th arp
      note: midiToNoteName(m),
      midi: m,
      freq: midiToFreq(m),
      velocity: i % 4 === 0 ? 0.85 : i % 2 === 0 ? 0.65 : 0.5,
      gate: 0.6,
      slide: false,
      paramType: i % 4 === 2 ? 'filter_cutoff' : 'none',
      paramValue: i % 4 === 2 ? 4200 : 0,
    };
  });

  // Track 3: Triangle Melodic Counter (MIDI 60 = C4)
  const track3 = createDefaultTrack(2, 'OSC 3 [TRIANGLE: HARMONY]', 'triangle', 60);
  const triNotes = [60, 60, 63, 63, 67, 67, 65, 65, 60, 60, 67, 70, 67, 65, 63, 62];
  track3.steps = track3.steps.map((st, i) => {
    const m = triNotes[i % triNotes.length];
    return {
      ...st,
      active: i === 0 || i === 4 || i === 8 || i === 10 || i === 12 || i === 14,
      note: midiToNoteName(m),
      midi: m,
      freq: midiToFreq(m),
      velocity: 0.75,
      gate: 0.9,
      slide: i === 10,
      paramType: i === 8 ? 'pan' : 'none',
      paramValue: i === 8 ? -0.8 : 0,
    };
  });

  // Track 4: Square Glitch & FM Ping (MIDI 72 = C5)
  const track4 = createDefaultTrack(3, 'OSC 4 [SQUARE: FM PING]', 'square', 72);
  const sqNotes = [72, 75, 79, 82, 72, 84, 79, 75, 72, 79, 82, 87, 84, 79, 75, 72];
  track4.steps = track4.steps.map((st, i) => {
    const m = sqNotes[i % sqNotes.length];
    const isPing = i === 2 || i === 6 || i === 11 || i === 15;
    return {
      ...st,
      active: isPing,
      note: midiToNoteName(m),
      midi: m,
      freq: midiToFreq(m),
      velocity: 0.9,
      gate: 0.4,
      slide: false,
      paramType: isPing ? 'fm_depth' : 'none',
      paramValue: isPing ? 180 : 0,
    };
  });

  return {
    enabled: true,
    bpm: 108,
    division: '1/16',
    swing: 0.12,
    mode: 'gated',
    tracks: [track1, track2, track3, track4],
  };
}

/**
 * Built-in Sequencer Presets
 */
export interface SequencerPreset {
  id: string;
  name: string;
  description: string;
  bpm: number;
  division: '1/4' | '1/8' | '1/16' | '1/32';
  mode: 'gated' | 'drone';
  config: SequencerConfig;
}

export const SEQUENCER_PRESETS: SequencerPreset[] = [
  {
    id: 'berlin-school',
    name: 'Berlin School Ostinato',
    description: '16-step classic modular Tangerine Dream sequence with 16th saw drive and filter accents.',
    bpm: 114,
    division: '1/16',
    mode: 'gated',
    config: getDefaultSequencerConfig(),
  },
  {
    id: 'ambient-polydrone',
    name: 'Polyrhythmic Ambient Phasing',
    description: 'Polymetric track lengths (16, 12, 7, 5 steps) creating evolving non-repeating melodic phasing.',
    bpm: 72,
    division: '1/8',
    mode: 'drone',
    config: {
      enabled: true,
      bpm: 72,
      division: '1/8',
      swing: 0.0,
      mode: 'drone',
      tracks: [
        {
          ...createDefaultTrack(0, 'OSC 1 [SINE: 16 STEPS]', 'sine', 36),
          length: 16,
          steps: Array.from({ length: 16 }, (_, i) => {
            const m = [36, 43, 39, 41][i % 4];
            return {
              active: true,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.9,
              gate: 1.0,
              slide: true,
              paramType: 'filter_cutoff',
              paramValue: 800 + i * 150,
            };
          }),
        },
        {
          ...createDefaultTrack(1, 'OSC 2 [SAW: 12 STEPS]', 'sawtooth', 48),
          length: 12,
          steps: Array.from({ length: 16 }, (_, i) => {
            const m = [48, 51, 55, 58, 60, 63][i % 6];
            return {
              active: i < 12,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.7,
              gate: 0.85,
              slide: i % 3 === 0,
              paramType: 'pan',
              paramValue: ((i % 5) - 2) * 0.4,
            };
          }),
        },
        {
          ...createDefaultTrack(2, 'OSC 3 [TRIANGLE: 7 STEPS]', 'triangle', 60),
          length: 7,
          steps: Array.from({ length: 16 }, (_, i) => {
            const m = [60, 63, 67, 70, 72, 67, 63][i % 7];
            return {
              active: i < 7,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.8,
              gate: 0.95,
              slide: true,
              paramType: 'none',
              paramValue: 0,
            };
          }),
        },
        {
          ...createDefaultTrack(3, 'OSC 4 [SQUARE: 5 STEPS]', 'square', 72),
          length: 5,
          steps: Array.from({ length: 16 }, (_, i) => {
            const m = [72, 75, 79, 82, 84][i % 5];
            return {
              active: i < 5,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.6,
              gate: 0.5,
              slide: false,
              paramType: 'fm_depth',
              paramValue: 120 + i * 40,
            };
          }),
        },
      ],
    },
  },
  {
    id: 'fm-glitch-dub',
    name: 'Dub Glitch Echo Matrix',
    description: 'Syncopated square and triangle bursts triggering Particle V2 granular pitch changes and FM spikes.',
    bpm: 88,
    division: '1/16',
    mode: 'gated',
    config: {
      enabled: true,
      bpm: 88,
      division: '1/16',
      swing: 0.25,
      mode: 'gated',
      tracks: [
        {
          ...createDefaultTrack(0, 'OSC 1 [SINE: DUB SUB]', 'sine', 34),
          length: 16,
          steps: Array.from({ length: 16 }, (_, i) => {
            const active = i === 0 || i === 6 || i === 10;
            const m = i === 10 ? 37 : 34;
            return {
              active,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.95,
              gate: 0.9,
              slide: false,
              paramType: 'filter_cutoff',
              paramValue: 600,
            };
          }),
        },
        {
          ...createDefaultTrack(1, 'OSC 2 [SAW: DUB STAB]', 'sawtooth', 46),
          length: 16,
          steps: Array.from({ length: 16 }, (_, i) => {
            const active = i === 4 || i === 12;
            const m = 46;
            return {
              active,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.85,
              gate: 0.35,
              slide: false,
              paramType: 'filter_cutoff',
              paramValue: 3500,
            };
          }),
        },
        {
          ...createDefaultTrack(2, 'OSC 3 [TRIANGLE: ECHO CHORD]', 'triangle', 58),
          length: 16,
          steps: Array.from({ length: 16 }, (_, i) => {
            const active = i === 4 || i === 12 || i === 14;
            const m = i === 14 ? 61 : 58;
            return {
              active,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.75,
              gate: 0.4,
              slide: false,
              paramType: 'pan',
              paramValue: i === 4 ? -0.7 : 0.7,
            };
          }),
        },
        {
          ...createDefaultTrack(3, 'OSC 4 [SQUARE: FM BURST]', 'square', 70),
          length: 16,
          steps: Array.from({ length: 16 }, (_, i) => {
            const active = i === 2 || i === 8 || i === 11 || i === 15;
            const m = 70 + (i % 3) * 3;
            return {
              active,
              note: midiToNoteName(m),
              midi: m,
              freq: midiToFreq(m),
              velocity: 0.9,
              gate: 0.25,
              slide: false,
              paramType: 'fm_depth',
              paramValue: 240,
            };
          }),
        },
      ],
    },
  },
];
