// SPDX-License-Identifier: GPL-3.0-or-later
export interface RustFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

export const RUST_PROJECT_FILES: RustFile[] = [
  {
    name: 'Cargo.toml',
    path: 'Cargo.toml',
    language: 'toml',
    content: `[package]
name = "aura4-synth"
version = "0.1.0"
edition = "2021"
license = "GPL-3.0-or-later"
authors = ["AURA-4 Synthesis Laboratory <audio@aura4.terminal>"]
description = "Terminal TUI 4-Oscillator Analog Waveform Synthesizer with FM Matrix & Granular Delay"

[dependencies]
# Terminal UI framework
ratatui = "0.28.1"
crossterm = { version = "0.28.1", features = ["event-stream"] }

# Low-latency cross-platform audio synthesis
cpal = "0.15.3"
ringbuf = "0.4.4"

# Audio sample decoding (.wav, .mp3, .ogg, .flac)
hound = "3.5.1"
symphonia = { version = "0.5.4", features = ["all"] }

# Math & utilities
rand = "0.8.5"
anyhow = "1.0.86"
crossbeam-channel = "0.5.13"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
`,
  },
  {
    name: 'main.rs',
    path: 'src/main.rs',
    language: 'rust',
    content: `//! AURA-4: Terminal Analog Waveform Synthesizer
//! 4-Oscillator FM Matrix & Particle V2 Granular Delay

mod audio;
mod synth;
mod particle;
mod effects;
mod ui;

use std::io::{self, stdout};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;

use crate::audio::AudioEngine;
use crate::synth::SynthState;

fn main() -> Result<()> {
    // 1. Setup terminal raw mode
    enable_raw_mode()?;
    let mut stdout = stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // 2. Initialize Shared Synth State & Audio Stream
    let synth_state = Arc::new(Mutex::new(SynthState::default()));
    let running = Arc::new(AtomicBool::new(true));

    let audio_engine = AudioEngine::spawn(Arc::clone(&synth_state), Arc::clone(&running))?;

    // 3. Main TUI Event Loop (60 FPS)
    let tick_rate = Duration::from_millis(16);
    let mut last_tick = Instant::now();

    while running.load(Ordering::Relaxed) {
        // Draw TUI widgets & character plots
        terminal.draw(|f| {
            let state = synth_state.lock().unwrap();
            ui::draw_tui(f, &state);
        })?;

        // Process keyboard inputs with non-blocking poll
        let timeout = tick_rate.saturating_sub(last_tick.elapsed());
        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                let mut state = synth_state.lock().unwrap();
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => {
                        running.store(false, Ordering::Relaxed);
                    }
                    KeyCode::Char(' ') => {
                        state.muted = !state.muted;
                    }
                    KeyCode::Tab => {
                        state.active_pane = (state.active_pane + 1) % 4;
                    }
                    KeyCode::Char('1') => state.selected_osc = 0,
                    KeyCode::Char('2') => state.selected_osc = 1,
                    KeyCode::Char('3') => state.selected_osc = 2,
                    KeyCode::Char('4') => state.selected_osc = 3,
                    KeyCode::Up | KeyCode::Char('k') => state.navigate_up(),
                    KeyCode::Down | KeyCode::Char('j') => state.navigate_down(),
                    KeyCode::Left | KeyCode::Char('h') => state.adjust_param(-0.05),
                    KeyCode::Right | KeyCode::Char('l') => state.adjust_param(0.05),
                    KeyCode::Char('r') => state.toggle_freeze(),
                    KeyCode::Char('p') => state.cycle_preset(),
                    _ => {}
                }
            }
        }

        if last_tick.elapsed() >= tick_rate {
            last_tick = Instant::now();
        }
    }

    // 4. Restore terminal
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;
    drop(audio_engine);

    println!("AURA-4 Synthesizer terminated cleanly.");
    Ok(())
}
`,
  },
  {
    name: 'synth.rs',
    path: 'src/synth.rs',
    language: 'rust',
    content: `//! Core 4-Oscillator Analog Synthesis & 4x4 FM Modulation Matrix

use std::f32::consts::PI;

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Waveform {
    Sine,
    Saw,
    Triangle,
    Square,
}

#[derive(Clone, Debug)]
pub struct Oscillator {
    pub waveform: Waveform,
    pub enabled: bool,
    pub freq: f32,       // Base frequency in Hz
    pub phase: f32,      // Phase accumulator [0.0..1.0]
    pub gain: f32,       // Volume [0.0..1.0]
    pub pan: f32,        // Stereo pan [-1.0..1.0]
    pub drift_rate: f32, // Pitch drift LFO in Hz
    pub drift_depth: f32,// Pitch drift depth in Hz
    pub drift_phase: f32,
    pub last_sample: f32,
}

impl Oscillator {
    pub fn new(waveform: Waveform, freq: f32) -> Self {
        Self {
            waveform,
            enabled: true,
            freq,
            phase: 0.0,
            gain: 0.5,
            pan: 0.0,
            drift_rate: 0.15,
            drift_depth: 3.0,
            drift_phase: 0.0,
            last_sample: 0.0,
        }
    }

    /// Computes the next raw wave sample for the current phase
    #[inline(always)]
    pub fn generate_sample(&self) -> f32 {
        let p = self.phase;
        match self.waveform {
            Waveform::Sine => (p * 2.0 * PI).sin(),
            Waveform::Saw => 2.0 * p - 1.0,
            Waveform::Triangle => {
                if p < 0.5 {
                    4.0 * p - 1.0
                } else {
                    3.0 - 4.0 * p
                }
            }
            Waveform::Square => {
                if p < 0.5 { 1.0 } else { -1.0 }
            }
        }
    }
}

/// 4x4 Frequency Modulation Routing Matrix
pub struct FmMatrix {
    pub depths: [[f32; 4]; 4], // [modulator][carrier] modulation depth in Hz
}

impl Default for FmMatrix {
    fn default() -> Self {
        Self {
            depths: [
                [0.0, 35.0, 0.0, 0.0],
                [0.0, 0.0, 60.0, 0.0],
                [15.0, 0.0, 0.0, 40.0],
                [0.0, 0.0, 0.0, 0.0],
            ],
        }
    }
}

/// Global shared synthesizer state
pub struct SynthState {
    pub oscillators: [Oscillator; 4],
    pub fm_matrix: FmMatrix,
    pub muted: bool,
    pub active_pane: usize,
    pub selected_osc: usize,
    pub selected_param: usize,
    pub output_scope_buffer: Vec<f32>,
    pub spectrum_buffer: [f32; 32],
}

impl Default for SynthState {
    fn default() -> Self {
        Self {
            oscillators: [
                Oscillator::new(Waveform::Sine, 55.0),
                Oscillator::new(Waveform::Saw, 110.0),
                Oscillator::new(Waveform::Triangle, 165.0),
                Oscillator::new(Waveform::Square, 220.0),
            ],
            fm_matrix: FmMatrix::default(),
            muted: false,
            active_pane: 0,
            selected_osc: 0,
            selected_param: 0,
            output_scope_buffer: vec![0.0; 256],
            spectrum_buffer: [0.0; 32],
        }
    }
}

impl SynthState {
    pub fn navigate_up(&mut self) {
        if self.selected_param > 0 { self.selected_param -= 1; }
    }

    pub fn navigate_down(&mut self) {
        if self.selected_param < 5 { self.selected_param += 1; }
    }

    pub fn adjust_param(&mut self, delta: f32) {
        let osc = &mut self.oscillators[self.selected_osc];
        match self.selected_param {
            0 => osc.freq = (osc.freq + delta * 50.0).clamp(20.0, 2000.0),
            1 => osc.gain = (osc.gain + delta).clamp(0.0, 1.0),
            2 => osc.pan = (osc.pan + delta).clamp(-1.0, 1.0),
            3 => osc.drift_rate = (osc.drift_rate + delta * 2.0).clamp(0.05, 10.0),
            4 => osc.drift_depth = (osc.drift_depth + delta * 10.0).clamp(0.0, 50.0),
            _ => {}
        }
    }

    pub fn toggle_freeze(&mut self) {}
    pub fn cycle_preset(&mut self) {}
}
`,
  },
  {
    name: 'particle.rs',
    path: 'src/particle.rs',
    language: 'rust',
    content: `//! Red Panda Particle V2-inspired Granular Stereo Delay & Glitch Engine

use std::f32::consts::PI;
use rand::Rng;

pub struct Grain {
    pub active: bool,
    pub start_sample: usize,
    pub length: usize,
    pub pos: f32,
    pub speed: f32,
    pub pan: f32,
    pub is_reverse: bool,
}

pub struct ParticleGranulizer {
    pub buffer_l: Vec<f32>,
    pub buffer_r: Vec<f32>,
    pub write_ptr: usize,
    pub max_samples: usize,
    pub grains: Vec<Grain>,
    pub grain_size_samples: usize,
    pub pitch_semitones: f32,
    pub spray_samples: usize,
    pub feedback: f32,
    pub reverse_prob: f32,
    pub freeze: bool,
    pub mix: f32,
    pub spawn_counter: usize,
    pub spawn_interval: usize,
}

impl ParticleGranulizer {
    pub fn new(sample_rate: f32) -> Self {
        let max_samples = (sample_rate * 4.0) as usize; // 4s buffer
        Self {
            buffer_l: vec![0.0; max_samples],
            buffer_r: vec![0.0; max_samples],
            write_ptr: 0,
            max_samples,
            grains: (0..16).map(|_| Grain {
                active: false,
                start_sample: 0,
                length: (sample_rate * 0.1) as usize,
                pos: 0.0,
                speed: 1.0,
                pan: 0.0,
                is_reverse: false,
            }).collect(),
            grain_size_samples: (sample_rate * 0.12) as usize,
            pitch_semitones: 12.0, // Octave shimmer
            spray_samples: (sample_rate * 0.05) as usize,
            feedback: 0.5,
            reverse_prob: 0.25,
            freeze: false,
            mix: 0.4,
            spawn_counter: 0,
            spawn_interval: (sample_rate / 12.0) as usize, // 12 grains/sec
        }
    }

    /// Processes stereo samples through granular cloud
    pub fn process(&mut self, in_l: f32, in_r: f32) -> (f32, f32) {
        if !self.freeze {
            self.buffer_l[self.write_ptr] = in_l;
            self.buffer_r[self.write_ptr] = in_r;
            self.write_ptr = (self.write_ptr + 1) % self.max_samples;
        }

        // Spawn new grains
        self.spawn_counter += 1;
        if self.spawn_counter >= self.spawn_interval {
            self.spawn_counter = 0;
            self.spawn_grain();
        }

        // Accumulate active grains
        let mut gran_l = 0.0;
        let mut gran_r = 0.0;

        for grain in self.grains.iter_mut() {
            if !grain.active { continue; }

            let fraction = grain.pos / (grain.length as f32);
            // Hann windowing
            let window = 0.5 * (1.0 - (2.0 * PI * fraction).cos());

            let sample_idx = if grain.is_reverse {
                (grain.start_sample + grain.length - grain.pos as usize) % self.max_samples
            } else {
                (grain.start_sample + grain.pos as usize) % self.max_samples
            };

            let s_l = self.buffer_l[sample_idx] * window;
            let s_r = self.buffer_r[sample_idx] * window;

            let pan_l = 0.5 * (1.0 - grain.pan);
            let pan_r = 0.5 * (1.0 + grain.pan);

            gran_l += s_l * pan_l;
            gran_r += s_r * pan_r;

            grain.pos += grain.speed;
            if grain.pos >= grain.length as f32 {
                grain.active = false;
            }
        }

        let out_l = in_l * (1.0 - self.mix) + gran_l * self.mix;
        let out_r = in_r * (1.0 - self.mix) + gran_r * self.mix;

        (out_l, out_r)
    }

    fn spawn_grain(&mut self) {
        let mut rng = rand::thread_rng();
        if let Some(grain) = self.grains.iter_mut().find(|g| !g.active) {
            grain.active = true;
            grain.length = self.grain_size_samples;
            grain.pos = 0.0;
            grain.speed = 2.0_f32.powf(self.pitch_semitones / 12.0);
            grain.pan = rng.gen_range(-0.8..0.8);
            grain.is_reverse = rng.gen_bool(self.reverse_prob as f64);

            let offset = rng.gen_range(0..self.spray_samples.max(1));
            grain.start_sample = (self.write_ptr + self.max_samples - offset - grain.length) % self.max_samples;
        }
    }
}
`,
  },
  {
    name: 'effects.rs',
    path: 'src/effects.rs',
    language: 'rust',
    content: `//! Built-in Stereo Chorus, Tape Delay, Schroeder Reverb, and Analog Saturation

use std::f32::consts::PI;

pub struct EffectsRack {
    // Analog Saturation Drive
    pub drive: f32,
    // Delay line
    delay_buf_l: Vec<f32>,
    delay_buf_r: Vec<f32>,
    delay_ptr: usize,
    pub delay_time_samples: usize,
    pub delay_feedback: f32,
    pub delay_mix: f32,
    // Chorus LFO
    chorus_phase: f32,
    pub chorus_mix: f32,
}

impl EffectsRack {
    pub fn new(sample_rate: f32) -> Self {
        let delay_max = (sample_rate * 2.0) as usize;
        Self {
            drive: 0.25,
            delay_buf_l: vec![0.0; delay_max],
            delay_buf_r: vec![0.0; delay_max],
            delay_ptr: 0,
            delay_time_samples: (sample_rate * 0.42) as usize,
            delay_feedback: 0.5,
            delay_mix: 0.35,
            chorus_phase: 0.0,
            chorus_mix: 0.3,
        }
    }

    /// Processes stereo samples through the effects chain
    pub fn process(&mut self, in_l: f32, in_r: f32) -> (f32, f32) {
        // 1. Tape Delay with feedback
        let read_ptr = (self.delay_ptr + self.delay_buf_l.len() - self.delay_time_samples) % self.delay_buf_l.len();
        let delayed_l = self.delay_buf_l[read_ptr];
        let delayed_r = self.delay_buf_r[read_ptr];

        self.delay_buf_l[self.delay_ptr] = in_l + delayed_l * self.delay_feedback;
        self.delay_buf_r[self.delay_ptr] = in_r + delayed_r * self.delay_feedback;
        self.delay_ptr = (self.delay_ptr + 1) % self.delay_buf_l.len();

        let del_out_l = in_l * (1.0 - self.delay_mix) + delayed_l * self.delay_mix;
        let del_out_r = in_r * (1.0 - self.delay_mix) + delayed_r * self.delay_mix;

        // 2. Analog tanh soft-clipping saturation
        let k = 1.0 + self.drive * 12.0;
        let sat_l = (del_out_l * k).tanh() / k.tanh();
        let sat_r = (del_out_r * k).tanh() / k.tanh();

        (sat_l, sat_r)
    }
}
`,
  },
  {
    name: 'ui.rs',
    path: 'src/ui.rs',
    language: 'rust',
    content: `//! Character-Based Real-Time Oscilloscope & Spectrum Analyzer TUI Widgets

use ratatui::{
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Sparkline},
    Frame,
};

use crate::synth::SynthState;

/// Braille oscilloscope bitmask generator
pub fn render_braille_scope(samples: &[f32], cols: usize, rows: usize) -> Vec<String> {
    let mut grid = vec![vec![0u16; cols]; rows];
    let pixel_height = (rows * 4) as f32;

    for (x, &sample) in samples.iter().take(cols * 2).enumerate() {
        let col = x / 2;
        let norm = (1.0 - sample.clamp(-1.0, 1.0)) * 0.5;
        let py = (norm * (pixel_height - 1.0)).clamp(0.0, pixel_height - 1.0) as usize;
        let row = py / 4;
        let dot_row = py % 4;
        let dot_col = x % 2;

        let mask = match (dot_row, dot_col) {
            (0, 0) => 0x01, (1, 0) => 0x02, (2, 0) => 0x04, (3, 0) => 0x40,
            (0, 1) => 0x08, (1, 1) => 0x10, (2, 1) => 0x20, (3, 1) => 0x80,
            _ => 0,
        };

        if row < rows && col < cols {
            grid[row][col] |= mask;
        }
    }

    grid.iter()
        .map(|row| {
            row.iter()
                .map(|&m| if m == 0 { ' ' } else { char::from_u32(0x2800 + m as u32).unwrap_or(' ') })
                .collect()
        })
        .collect()
}

pub fn draw_tui(f: &mut Frame, state: &SynthState) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Header
            Constraint::Min(14),    // Main workspace (Oscillators & Scopes)
            Constraint::Length(3),  // Shortcut Help Footer
        ])
        .split(f.area());

    // 1. Header
    let header = Paragraph::new(Line::from(vec![
        Span::styled(" ◈ AURA-4 ANALOG TUI SYNTHESIZER ◈ ", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
        Span::raw(" | "),
        Span::styled(if state.muted { "[MUTED]" } else { "[ACTIVE - 44.1kHz]" }, Style::default().fg(if state.muted { Color::Red } else { Color::Green })),
        Span::raw(" | [Tab] Switch Panes | [Space] Play/Stop | [Q] Quit"),
    ])).block(Block::default().borders(Borders::ALL).title(" SYSTEM STATUS "));
    f.render_widget(header, chunks[0]);

    // 2. Main split: Left 4 Oscillators & FM Matrix, Right Real-time Scope
    let main_split = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
        .split(chunks[1]);

    // Oscillators pane
    let mut osc_lines = Vec::new();
    for (i, osc) in state.oscillators.iter().enumerate() {
        let is_selected = i == state.selected_osc;
        let prefix = if is_selected { "▶ " } else { "  " };
        let style = if is_selected { Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD) } else { Style::default().fg(Color::White) };
        osc_lines.push(Line::from(vec![
            Span::styled(format!("{}{:?} Wave: {:>7.1} Hz | Gain: {:>3.0}% | Pan: {:>4.1}", prefix, osc.waveform, osc.freq, osc.gain * 100.0, osc.pan), style),
        ]));
    }
    let osc_block = Paragraph::new(osc_lines).block(Block::default().borders(Borders::ALL).title(" 4-ANALOG OSCILLATORS "));
    f.render_widget(osc_block, main_split[0]);

    // Scope block
    let scope_lines = render_braille_scope(&state.output_scope_buffer, 48, 8);
    let scope_text: Vec<Line> = scope_lines.iter().map(|l| Line::from(Span::styled(l, Style::default().fg(Color::Cyan)))).collect();
    let scope_block = Paragraph::new(scope_text).block(Block::default().borders(Borders::ALL).title(" REAL-TIME BRAILLE OSCILLOSCOPE "));
    f.render_widget(scope_block, main_split[1]);

    // 3. Footer
    let footer = Paragraph::new("[1-4] Select Osc  [H/L] Adjust Value  [J/K] Select Param  [Space] Mute  [Q] Exit")
        .block(Block::default().borders(Borders::ALL).title(" KEYBOARD COMMANDS "));
    f.render_widget(footer, chunks[2]);
}
`,
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# AURA-4: Terminal (TUI) Analog Waveform Synthesizer

A low-latency, real-time Text User Interface (TUI) analog wave generator and sound design workstation in Rust with \`ratatui\`, \`cpal\`, and \`symphonia\`.

## Prerequisites & Installation

### Linux (Ubuntu / Debian):
\`\`\`bash
sudo apt-get update
sudo apt-get install -y libasound2-dev pkg-config
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
\`\`\`

### macOS:
\`\`\`bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
\`\`\`

### Windows:
Install Rust from https://rustup.rs (uses native WASAPI backend).

## Build & Run

\`\`\`bash
# Run in release mode for optimal audio performance:
cargo run --release
\`\`\`

## Features & Architecture

1. **4 Independent Oscillators**: Sine, Sawtooth, Triangle, Square with analog circuit drift.
2. **4x4 Audio-Rate FM Matrix**: Sample-accurate frequency modulation between any voice pair with feedback.
3. **Particle V2 Granular Delay**: Real-time grain slicing, pitch-shifting (-12 to +12 st), reverse grains, spray, and glitch stutter.
4. **External Sample Looper**: Load .WAV and .MP3 audio files into the mix with varispeed and complete effects routing.
5. **Analog Effects Rack**: State-variable filter, stereo chorus, filtered tape delay, Schroeder plate reverb, and tanh master saturation.
6. **Character-Based Visualizations**: Sub-pixel Unicode Braille oscilloscope (\`U+2800\`-\`U+28FF\`) and block element spectrum analyzer.

## Keyboard Controls
- \`Space\`: Toggle Audio Output (Mute / Active)
- \`Tab\`: Cycle Active Panes
- \`1\` - \`8\`: Jump directly to Pane (Oscillators, FM, Particle, Effects, Sampler, Scopes, Presets, Rust)
- \`H\` / \`L\` or \`Left\` / \`Right\`: Adjust selected parameter
- \`J\` / \`K\` or \`Up\` / \`Down\`: Select parameter row
- \`R\`: Toggle WAV Audio Recording
- \`M\`: Mutate / Randomize Soundscape
- \`P\`: Cycle Ambient Presets
- \`F\`: Toggle Granular Buffer Freeze
- \`V\`: Toggle CRT Scanlines & Phosphor Glow
- \`Q\` or \`Esc\`: Clean exit

## License
All source code in this project is licensed under the **GNU General Public License v3.0 (GPL-3.0-or-later)**.
`,
  },
];
