# AURA-4: Terminal (TUI) Analog Waveform Synthesizer

A low-latency, real-time Text User Interface (TUI) analog wave generator and ambient sound design workstation. Features four independent analog-emulated oscillators, a 4x4 audio-rate FM cross-modulation matrix, a Red Panda Particle V2-inspired granular stereo delay and glitch engine, an external WAV/MP3 sample looper with complete effects routing, and character-based waveform plotting.

---

## Prerequisites & Installation

### 1. Web TUI Workstation (Interactive Browser Engine)

The web version runs a sample-accurate Web Audio API synthesis engine with full keyboard navigation, CRT scanline emulation, and character-based Braille oscilloscopes.

#### Prerequisites:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

#### Installation & Startup:
```bash
# 1. Install dependencies
npm install

# 2. Launch the local development workstation
npm run dev

# 3. Open in your browser (default port 3000)
# http://localhost:3000

# 4. Production build
npm run build
```

---

### 2. Standalone Native Rust Application (`aura4-synth`)

The standalone Rust CLI application is written using `ratatui` for the terminal UI, `crossterm` for terminal raw-mode events, `cpal` for low-latency audio stream synthesis, and `symphonia` / `hound` for audio decoding. All Rust source files are available in the repository and in Tab `[8] RUST SOURCE CRATE` inside the app.

#### Prerequisites:
- **Rust Toolchain** (cargo, rustc 1.75+):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source $HOME/.cargo/env
  ```
- **Audio Development Headers**:
  - **Linux (Ubuntu/Debian)**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y libasound2-dev pkg-config
    ```
  - **Linux (Fedora/RHEL)**:
    ```bash
    sudo dnf install -y alsa-lib-devel pkg-config
    ```
  - **macOS**:
    CoreAudio is built-in. Ensure command line tools are installed:
    ```bash
    xcode-select --install
    ```
  - **Windows**:
    Uses native WASAPI audio backend; no extra development headers required.

#### Compilation & Startup:
```bash
# Run in optimized release mode for glitch-free low-latency audio:
cargo run --release

# Or build the binary directly:
cargo build --release
./target/release/aura4-synth
```

---

## Architectural & Feature Walkthrough

### 1. 4 Independent Analog Wave Generators
Each voice emulates classic voltage-controlled analog oscillators (VCOs) with continuous thermal drift and pitch flutter:
- **OSC 1 [SINE]**: Pure fundamental tone with zero harmonic distortion; ideal for subterranean bass foundations and smooth FM carrier signals.
- **OSC 2 [SAWTOOTH]**: Complete spectrum of odd and even harmonics ($1/n$ amplitude decay); provides rich, brassy leads and aggressive drone textures.
- **OSC 3 [TRIANGLE]**: Soft, flute-like tone containing only odd harmonics decaying rapidly ($1/n^2$); excellent for mellow pads and warm organ registers.
- **OSC 4 [SQUARE]**: Symmetrical pulse wave containing only odd harmonics; provides classic hollow-pipe acoustics and biting sync timbres.
- **Per-Oscillator Controls**:
  - Frequency (20 Hz to 1.2 kHz) with real-time musical pitch detection (`A4`, `C2`, etc.)
  - Octave Transposition (`-2` to `+2`)
  - Fine-Tuning in cents (`-50c` to `+50c`)
  - Volume Gain (`0%` to `100%`) with ASCII level indicators
  - Stereo Panning (`100% Left` to `100% Right`)
  - Analog Circuit Drift: Independent LFO rate (0.05 Hz – 3 Hz) and pitch flutter depth (0 – 25 cents).

---

### 2. 4x4 Audio-Rate FM Cross-Modulation Matrix
A sample-accurate modulation matrix where any oscillator can act as a modulator, carrier, or self-modulating feedback loop:
- **Rows**: Modulators (Osc 1, 2, 3, 4)
- **Columns**: Carriers (Osc 1, 2, 3, 4)
- **Modulation Depth**: 0 to 400 Hz audio-rate frequency deviation.
- **Pre-configured FM Algorithms**:
  - `CASCADE (1→2→3→4)`: Linear serial modulation creating evolving sidebands.
  - `BUCHLA CROSS-FM`: Mutual cross-modulation inspired by the Buchla 259 Dual Waveform Generator.
  - `BELL CHIMES`: Inharmonic sideband ratios producing crystalline and metallic percussion.
  - `CHAOS RING`: Circular feedback loop generating complex chaotic attractors.
  - `ZERO ALL`: Clears the matrix back to pure independent waveforms.

---

### 3. LFO Modulation Matrix & Macro Automation
Four multi-waveform Low-Frequency Oscillators assignable across the synthesizer's synthesis graph for organic, self-evolving ambient soundscapes:
- **4 LFO Generator Units**:
  - Waveforms: `Sine (∿)`, `Triangle (⋀)`, `Sawtooth (⩕)`, `Square (⊓)`, and `Sample & Hold Random (⚄)`.
  - Rate / Frequency: `0.02 Hz` (ultra-slow 50-second evolving ambient cycles) up to `10.0 Hz` (rapid tremolo/vibrato).
  - Master Depth (`0%` to `100%`) with live real-time ASCII position gauges (`[────●────]`).
- **Assignable Modulation Destinations**:
  - **Oscillator Pitches**: `OSC 1`, `OSC 2`, `OSC 3`, `OSC 4` Pitch (subtle pitch drift, detune breathing, microtonal glides).
  - **FM Modulation Indices**: `FM 1→2`, `FM 2→3`, `FM 3→4` (dynamic spectral timbre shifts from pure sines to bright metallic overtones).
  - **Filter Cutoff & Resonance**: Slow organic lowpass filter sweeps and resonant peaks.
  - **Particle V2 Granular Delay**: Real-time modulation of Grain Chop Size and Particle Pitch Shift.
  - **Tape Delay & Effects**: Tape Delay Time (analog tape wow & flutter), Stereo Chorus Rate, Reverb Wet Mix, and Stereo Auto-Panning.
- **Bipolar Modulation Depth**: `-100%` to `+100%` per route with mute toggles.
- **Built-in Modulation Presets**:
  - `COSMIC BREATHE`: Ultra-slow sine on Filter Cutoff + gentle pitch detune.
  - `S&H MODULAR CHAOS`: Stepped random Sample & Hold on FM depths and Particle pitch leaps.
  - `TAPE WOW & PAN`: Dual out-of-phase LFOs on Tape Delay Time and Stereo Auto-Pan.
  - `FM SWARM`: Fast cross-modulated LFOs sweeping multiple FM matrix indices.

---

### 4. 4-Track Synchronized Step Sequencer & Parameter Automation
A sample-accurate 4-track step sequencer grid synced to the audio engine's lookahead clock, enabling rhythmic sequencing, polyrhythmic phasing, and per-step parameter changes (parameter locks):
- **4 Dedicated Voice Tracks**:
  - `TRACK 1 [SINE]`: Sub-bass ostinatos and subterranean root motion.
  - `TRACK 2 [SAW]`: Melodic arpeggios, driving 16th basslines, and filter sweeps.
  - `TRACK 3 [TRIANGLE]`: Counter-melodies, modal chord stabs, and panning motion.
  - `TRACK 4 [SQUARE]`: High sync pings, percussive glitch bursts, and FM pings.
- **Clock & Synchronization**:
  - High-precision lookahead scheduler running on Web Audio `AudioContext.currentTime` with zero drift.
  - Tempo control: `30` to `240 BPM`.
  - Clock Divisions: `1/4`, `1/8`, `1/16`, and `1/32` notes.
  - Variable Swing / Shuffle: `0%` to `60%` groove timing.
  - **Operating Modes**:
    - `GATED SYNTH`: Articulates punchy ADSR amplitude envelopes and note gates on each active step.
    - `DRONE AUTOMATION`: Preserves continuous analog drone sustain while automating pitch leaps and parameter changes on each step.
- **Polymetric Sequence Lengths & Direction**:
  - Independent step lengths per track (e.g., 16 steps on Track 1, 12 steps on Track 2, 7 steps on Track 3, 5 steps on Track 4) for polymetric phasing patterns that never repeat.
  - Playback directions: Forward (`→`), Backward (`←`), Ping-Pong (`⇄`), and Random (`⚄`).
  - Octave transpositions (`-2` to `+2` octaves) and Mute / Solo toggles per track.
- **Per-Step Parameter Locks (P-Locks)**:
  - **Note & Pitch**: Full chromatic piano roll tuning (C1 to B5), microtonal frequency display, and portamento glide (`~`) between steps.
  - **Velocity & Gate**: Note dynamics (0%–100%) and duration gate lengths (10%–100%).
  - **Automated Parameter Changes**:
    - `FM MOD DEPTH`: Sends audio-rate modulation bursts (0–400 Hz) to the next carrier voice.
    - `FILTER CUTOFF`: Ramps filter cutoff frequency (80 Hz–14 kHz) dynamically on specific steps.
    - `STEREO PAN`: Hard-pans voice left or right for spatial rhythmic ping-pong.
    - `PARTICLE PITCH`: Transposes granular delay micro-grains polyphonically on selected accents.
- **Scale Quantizer & Pattern Presets**:
  - Instant quantization to 7 ambient scales (Minor Pentatonic, Dorian Ambient, Aeolian 432Hz, Lydian Ethereal, Harmonic Minor, Whole Tone, Sub-Bass Root & 5th).
  - Built-in sequencer patterns: *Berlin School Ostinato*, *Polyrhythmic Ambient Phasing*, and *Dub Glitch Echo Matrix*.

---

### 5. Red Panda Particle V2 Granular Stereo Delay
A real-time granular synthesis engine modeled after the Red Panda Particle V2 delay pedal:
- **Modes**:
  - `PITCH SHIFT`: Transposes micro-grains polyphonically (-12 to +12 semitones) for octave-up shimmer clouds or sub-octave rumble.
  - `REVERSE`: Slices incoming audio and plays micro-windows backwards with Hann envelope smoothing.
  - `GLITCH`: Randomizes pitch leaps, time offsets, and reverse probabilities for glitch soundscapes.
  - `STUTTER`: Micro-loop chops with high grain density (15–24 grains/sec) and rapid rhythmic repeats.
  - `DENSITY CLOUD`: Long grain windows (200–450 ms) smeared into an expansive ambient granular reverb.
- **Parameters**:
  - Grain Size / Chop (15 ms to 450 ms)
  - Density / Overlap (1 to 24 grains/second)
  - Delay Buffer Time (30 ms to 1.5 seconds)
  - Feedback (0% to 95%)
  - Spray (Random timing jitter from 0 ms to 180 ms)
  - Reverse Probability (0% to 100%)
  - **Buffer Freeze (`[F]`)**: Freezes the 4-second circulating memory buffer into an infinite sustained drone.

---

---

### 6. External Sample Player & Tape Looper
Load external audio files on a separate channel from the 4 oscillators, with dedicated mixing and effects routing:
- **Supported File Formats**: `.WAV`, `.MP3`, `.OGG`, `.FLAC`, `.AIFF`, `.M4A`.
- **Drag-and-Drop Dropzone**: Drop any audio file directly into the terminal window or browse via file dialog.
- **3 Built-in Ambient Tape Loops**:
  - *Sub-Hydrophone Tape (48Hz)*: Sub-aquatic hydrophone recording with deep lowpass resonance.
  - *Radio Telescope Harmonics*: Celestial sweep with additive overtone harmonics.
  - *Vintage Mellotron Chords*: Warm tape loop with subtle motor wow and flutter.
- **Character-Based Waveform & Scrubbing**:
  - Text-mode waveform plot displaying amplitude peaks.
  - Live playhead indicator (`▼`) tracking position in real time.
  - Loop Start (`├`) and Loop End (`┤`) range brackets with real-time scrub slider.
- **Varispeed & Reverse**:
  - Pitch shifting from `-24` to `+24` semitones (`-1 Oct`, `-5th`, `Unison`, `+5th`, `+1 Oct`).
  - Varispeed playback velocity from `0.25x` to `3.0x`.
  - Reverse Tape toggle for backwards playback loops.
- **Full Effects Rack Routing**:
  - Route external samples through the entire effects bus (Filter → Chorus → Particle V2 Granular Delay → Tape Delay → Schroeder Reverb) with adjustable send level, or bypass directly to the master output.

---

### 7. Analog Effects Rack & Master Bus
- **State-Variable Resonant Filter**: 12 dB/octave multimode filter with Lowpass, Bandpass, and Highpass curves; cutoff (80 Hz – 16 kHz) and resonance $Q$ (0.5 – 12.0).
- **Stereo Quadrature Chorus**: Dual delay lines modulated with a 90° quadrature phase offset for wide stereo depth without mono phase cancellation.
- **Filtered Analog Tape Delay**: Delay time (40 ms – 1.2 s), damped high-frequency feedback (800 Hz – 9 kHz), and wow/flutter tape motor simulation.
- **Schroeder Atmospheric Reverb**: Algorithmic plate reverberator with exponential decay (0.8 s – 9.5 s) and high-frequency damping.
- **Master Analog Saturation ($\tanh$) & Limiter**: Soft-clipping hyperbolic tangent saturation curve for warm console drive, followed by a fast-attack brickwall peak limiter.

---

### 8. Real-Time Character-Based Visualizations
- **Sub-Pixel Braille Oscilloscope**: Utilizes 8-dot Unicode Braille patterns (`U+2800` to `U+28FF`) with zero-crossing triggering to plot waveforms at sub-character resolution at 35–60 FPS.
- **FFT Block Spectrum Analyzer**: 8-level vertical block elements (` ` to `█`) across 512 frequency bins with peak-hold indicators (`▔`).
- **Stereo Phase / Lissajous Scope**: 2D Braille plot showing Left vs. Right correlation and stereo width.
- **Signal Telemetry Bar**: Real-time Peak dBFS, RMS dBFS, Crest Factor, and fundamental frequency estimation.

---

### 9. Ambient Presets & Scale Quantizer
- **Curated Soundscape Patches**:
  - *Cosmic Drift*: Deep evolving ambient drone with octave sub-bass sine, warm saw drift, and subtle FM breathing.
  - *Particle Cloud Shimmer*: Granular cloud delay slicing waveforms into octave-up reverse crystals.
  - *Buchla 259 Metallic FM*: High-index cross-modulation FM bell tones.
  - *1984 Glitch Looper*: Saturated analog tape degradation with stutter grains.
  - *Aeolian Abyss*: Subterranean minor drone tuned to 432 Hz Pythagorean ratios.
- **Harmonic Scale Quantizer**: Tunes all 4 oscillators to just intonation or drone chords with one click (432 Hz Natural Drone, Pythagorean 5ths, Lydian Space Cluster, Minor Aeolian, Sub-Bass Monolith).
- **Mutate Patch (`[M]`)**: Randomizes frequencies, FM modulation, and grain parameters.
- **WAV Audio Recorder (`[R]`)**: Records performances to 16-bit stereo WAV/WebM files for immediate download.

---

## Keyboard Command Reference

| Hotkey | Action | Description |
| :--- | :--- | :--- |
| `[Space]` | **Toggle Audio Engine** | Starts or mutes audio synthesis |
| `[Tab]` | **Next Tab** | Cycles forward through tabs 1 to 10 |
| `[Shift + Tab]` | **Previous Tab** | Cycles backwards through tabs |
| `[1]` | **Oscillators** | Focuses the 4-Voice Wave Generators pane |
| `[2]` | **FM Matrix** | Focuses the 4x4 Frequency Modulation Matrix pane |
| `[3]` | **LFO Matrix** | Focuses the LFO Modulation Matrix & Automation pane |
| `[4]` | **Step Sequencer** | Focuses the 4-Track Step Sequencer & Parameter Locks pane |
| `[5]` | **Particle Delay** | Focuses the Red Panda Particle V2 Granular Delay pane |
| `[6]` | **Effects Rack** | Focuses the Filter, Chorus, Tape Delay & Reverb pane |
| `[7]` | **Tape Sampler** | Focuses the External WAV/MP3 Sampler & Looper pane |
| `[8]` | **Character Scopes**| Focuses the Braille Oscilloscope & FFT Spectrum pane |
| `[9]` | **Presets & Drones**| Focuses the Curated Patches & Scale Quantizer pane |
| `[0]` | **Rust Source Crate**| Focuses the Native Rust Codebase & Export pane |
| `[R]` | **Toggle Recording** | Starts / stops live audio recording to a file |
| `[M]` | **Mutate Soundscape**| Randomizes frequencies, FM depths, and grain parameters |
| `[P]` | **Cycle Preset** | Advances to the next curated ambient patch |
| `[F]` | **Freeze Buffer** | Latches the Particle V2 granular memory buffer |
| `[V]` | **CRT Scanlines** | Toggles CRT scanlines and phosphor glow |
| `[?]` / `[Esc]` | **Help Manual** | Opens / closes the keyboard shortcuts and user manual |

---

## Phosphor Color Themes

Switchable from the top header or via theme selection:
- **Amber CRT** (`#ffb000`): Classic monochrome DEC VT220 terminal aesthetic.
- **Phosphor Green** (`#00ff66`): IBM 5151 / VT100 phosphor glow.
- **Cyber Cyan** (`#00f0ff`): High-contrast cyberpunk terminal.
- **Matrix Green** (`#22c55e`): Deep emerald matrix phosphor.
- **Studio Slate** (`#e2e8f0`): Modern studio dark slate layout.

---

## Project Structure

```
├── README.md                      # Comprehensive user manual and compilation guide
├── index.html                     # HTML5 entry point with JetBrains Mono font
├── metadata.json                  # AI Studio application metadata
├── package.json                   # Web dependencies and scripts
├── src/
│   ├── App.tsx                    # Main workstation controller & keyboard coordinator
│   ├── main.tsx                   # React root entry point
│   ├── index.css                  # Tailwind CSS, CRT scanlines, and glow definitions
│   ├── types/
│   │   └── synth.ts               # Data models for oscillators, FM, LFO, sequencer, sampler & FX
│   ├── audio/
│   │   └── AudioEngine.ts         # Web Audio API engine (4-Osc, FM, LFO, Sequencer, Particle V2, Sampler)
│   ├── utils/
│   │   └── tuiPlots.ts            # Braille waveform scope & block spectrum generators
│   ├── data/
│   │   ├── presets.ts             # Curated ambient sound design patches & drone scales
│   │   ├── sequencerData.ts       # Note maps, ambient scales, and sequencer presets
│   │   └── rustCodebase.ts        # Standalone Rust crate source code (Cargo.toml, main.rs)
│   └── components/
│       ├── TuiHeader.tsx          # Terminal header, meters, REC, theme switcher, CRT toggle
│       ├── TuiTabs.tsx            # Numeric tab navigation bar (Tabs 1-10)
│       ├── OscillatorsPane.tsx    # 4 independent analog wave channels
│       ├── FmMatrixPane.tsx       # 4x4 audio-rate FM cross-modulation matrix
│       ├── LfoMatrixPane.tsx      # LFO modulation matrix & macro automation router
│       ├── SequencerPane.tsx      # 4-track step sequencer & parameter lock automation grid
│       ├── ParticleDelayPane.tsx  # Red Panda Particle V2 granular delay & glitch engine
│       ├── EffectsPane.tsx        # Filter, chorus, tape delay, reverb & master drive
│       ├── SamplePane.tsx         # External WAV/MP3 sampler, tape looper & effects bus
│       ├── VisualizerPane.tsx     # Fullscreen Braille oscilloscope & FFT spectrum
│       ├── PresetsPane.tsx        # Ambient patch library & drone chord quantizer
│       ├── RustCodePane.tsx       # Interactive Rust source browser & crate exporter
│       ├── TuiFooter.tsx          # Terminal shortcut bar
│       └── HelpModal.tsx          # In-app user manual and cheatsheet dialog
```

---

## License

Apache-2.0
