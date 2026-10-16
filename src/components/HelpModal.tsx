import React from 'react';
import { X, Keyboard, Radio, Sliders, Cpu } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="max-w-2xl w-full border border-current bg-black p-5 shadow-2xl font-mono text-xs max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-current/30 pb-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>┌─[ AURA-4 SYNTHESIZER USER MANUAL ]</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-current/40 hover:border-current hover:bg-current hover:text-black cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Section 1: Keyboard Shortcuts */}
        <div className="space-y-2">
          <div className="font-bold flex items-center gap-1.5 opacity-90 border-b border-current/15 pb-1">
            <Keyboard size={13} />
            <span>01. KEYBOARD COMMAND REFERENCE</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] pt-1">
            <div className="flex justify-between">
              <span className="font-bold">[SPACE]</span>
              <span className="opacity-70">Toggle Sound (Mute/Active)</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[TAB]</span>
              <span className="opacity-70">Cycle Next Tab</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[1] - [0]</span>
              <span className="opacity-70">Jump directly to Tabs 1-10</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[R]</span>
              <span className="opacity-70">Toggle Live WAV Recording</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[M]</span>
              <span className="opacity-70">Randomize / Mutate Patch</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[P]</span>
              <span className="opacity-70">Cycle Ambient Presets</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[F]</span>
              <span className="opacity-70">Toggle Granular Buffer Freeze</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[V]</span>
              <span className="opacity-70">Toggle CRT Scanlines &amp; Glow</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">[?] / [ESC]</span>
              <span className="opacity-70">Open / Close Manual</span>
            </div>
          </div>
        </div>

        {/* Section 2: Step Sequencer Grid */}
        <div className="space-y-2 pt-2">
          <div className="font-bold flex items-center gap-1.5 opacity-90 border-b border-current/15 pb-1">
            <Radio size={13} />
            <span>02. STEP SEQUENCER MATRIX &amp; PARAMETER AUTOMATION</span>
          </div>
          <p className="text-[11px] opacity-75 leading-relaxed">
            Sample-accurate 4-track step sequencer synchronized to the Web Audio engine's internal lookahead clock:
            <br />
            • <strong className="font-bold">4 Independent Oscillator Tracks:</strong> Trigger melodic and bass sequences on OSC 1 (Sine), OSC 2 (Saw), OSC 3 (Triangle), and OSC 4 (Square).
            <br />
            • <strong className="font-bold">Polymetric Sequence Lengths:</strong> Set independent track lengths (e.g. 16, 12, 7, 5 steps) and playback directions (Forward, Backward, Ping-Pong, Random) for self-phasing polyrhythms.
            <br />
            • <strong className="font-bold">Parameter Locks (P-Locks):</strong> Automate FM Modulation Depth, Filter Cutoff Frequency, Stereo Pan, or Particle V2 Granular Pitch on individual steps.
            <br />
            • <strong className="font-bold">Gated vs Drone Automation:</strong> Choose between punchy ADSR note articulation (Gated Synth) or continuous ambient drone pitch/parameter evolution (Drone Mode).
          </p>
        </div>

        {/* Section 3: LFO Modulation Matrix */}
        <div className="space-y-2 pt-2">
          <div className="font-bold flex items-center gap-1.5 opacity-90 border-b border-current/15 pb-1">
            <Radio size={13} />
            <span>03. LFO MODULATION MATRIX &amp; EVOLVING AUTOMATION</span>
          </div>
          <p className="text-[11px] opacity-75 leading-relaxed">
            Four assignable Low-Frequency Oscillators (0.02 Hz to 20.0 Hz) with Sine, Triangle, Sawtooth, Square, and Sample &amp; Hold Random waveforms:
            <br />
            • <strong className="font-bold">Pitch Modulation:</strong> Route subtle slow LFOs to Oscillator frequencies for organic, evolving detune and microtonal breathing.
            <br />
            • <strong className="font-bold">FM Index Modulation:</strong> Modulate FM carrier/modulator gains for dynamic spectral timbral shifts from smooth sine waves to bright bell harmonics.
            <br />
            • <strong className="font-bold">Effects Automation:</strong> Modulate Filter Cutoff, Filter Resonance, Tape Delay Time (analog wow &amp; flutter), Chorus Rate, and Reverb Mix for living, breathing ambient soundscapes.
          </p>
        </div>

        {/* Section 4: External Tape & Audio Sample Looper */}
        <div className="space-y-2 pt-2">
          <div className="font-bold flex items-center gap-1.5 opacity-90 border-b border-current/15 pb-1">
            <Radio size={13} />
            <span>04. EXTERNAL .WAV / .MP3 SAMPLE PLAYER &amp; EFFECTS BUS</span>
          </div>
          <p className="text-[11px] opacity-75 leading-relaxed">
            Load external audio files (.wav, .mp3, .ogg, .flac) or use the built-in ambient tape loops:
            <br />
            • <strong className="font-bold">Independent Channel:</strong> Exists alongside the 4 analog oscillators with dedicated gain, panning, and looping controls.
            <br />
            • <strong className="font-bold">Effects Rack Routing:</strong> Toggle effects send to route your external sample through the State-Variable Filter, Stereo Chorus, Red Panda Particle V2 Granular Delay, Tape Delay, and Reverb!
            <br />
            • <strong className="font-bold">Tape Varispeed &amp; Reverse:</strong> Repitch ±24 semitones, modulate playback rate (0.25x to 3x), or flip playback into backwards reverse tape loops.
          </p>
        </div>

        {/* Section 5: Synthesis Engine Architecture */}
        <div className="space-y-2 pt-2">
          <div className="font-bold flex items-center gap-1.5 opacity-90 border-b border-current/15 pb-1">
            <Radio size={13} />
            <span>05. 4-OSCILLATOR ANALOG SYNTHESIS</span>
          </div>
          <p className="text-[11px] opacity-75 leading-relaxed">
            Each voice emulates classic voltage-controlled analog generators:
            <br />
            • <strong className="font-bold">OSC 1 [SINE]:</strong> Pure fundamental for deep sub-bass and clean carrier tones.
            <br />
            • <strong className="font-bold">OSC 2 [SAW]:</strong> Rich odd and even harmonic spectrum, ideal for brassy ambient leads.
            <br />
            • <strong className="font-bold">OSC 3 [TRIANGLE]:</strong> Muted odd harmonics, creates soft flute-like timbres.
            <br />
            • <strong className="font-bold">OSC 4 [SQUARE]:</strong> Hollow hollow-pipe sound, rich in odd harmonics.
            <br />
            Analog drift introduces continuous microscopic pitch variations imitating ambient heat fluctuation in vintage transistor circuits.
          </p>
        </div>

        {/* Section 6: Red Panda Particle V2 Granular Delay */}
        <div className="space-y-2 pt-2">
          <div className="font-bold flex items-center gap-1.5 opacity-90 border-b border-current/15 pb-1">
            <Sliders size={13} />
            <span>06. RED PANDA PARTICLE V2 GRANULAR ENGINE</span>
          </div>
          <p className="text-[11px] opacity-75 leading-relaxed">
            Particle V2 slices incoming audio into micro-grains (10ms - 500ms) with Hann windowing, allowing:
            <br />
            • <strong className="font-bold">Pitch Shift:</strong> Polyphonic octave shimmer (+12 semitones) or subterranean rumblings (-12 semitones).
            <br />
            • <strong className="font-bold">Reverse Grains:</strong> Backwards playback of micro-slices for surreal ambient textures.
            <br />
            • <strong className="font-bold">Glitch &amp; Stutter:</strong> High-density randomized loop fragments and time jumps.
            <br />
            • <strong className="font-bold">Buffer Freeze:</strong> Latches the 4-second memory buffer, creating infinite sustained drone clouds.
          </p>
        </div>

        {/* Section 7: Standalone Rust Crate */}
        <div className="space-y-2 pt-2">
          <div className="font-bold flex items-center gap-1.5 opacity-90 border-b border-current/15 pb-1">
            <Cpu size={13} />
            <span>07. RUNNING AS A STANDALONE RUST APP</span>
          </div>
          <p className="text-[11px] opacity-75 leading-relaxed">
            The complete Rust crate source code is provided in Tab [0]. You can compile it locally in any Linux, macOS, or Windows terminal:
          </p>
          <pre className="p-2 bg-black border border-current/25 text-[11px] text-current/90 select-text">
            cargo run --release
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-current/20">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-current bg-current text-black font-bold cursor-pointer hover:opacity-90"
          >
            DISMISS [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
