import React from 'react';
import { GranularConfig, ParticleMode } from '../types/synth';
import { renderAsciiSlider } from '../utils/tuiPlots';

interface ParticleDelayPaneProps {
  config: GranularConfig;
  onChange: (config: GranularConfig) => void;
}

export const ParticleDelayPane: React.FC<ParticleDelayPaneProps> = ({
  config,
  onChange,
}) => {
  const update = (updates: Partial<GranularConfig>) => {
    onChange({ ...config, ...updates });
  };

  const modes: { id: ParticleMode; label: string; desc: string }[] = [
    { id: 'pitch', label: 'PITCH SHIFT', desc: 'Polyphonic pitch-shifted grain delay' },
    { id: 'reverse', label: 'REVERSE', desc: 'Reverse grain slicing & backwards delay' },
    { id: 'glitch', label: 'GLITCH', desc: 'Random pitch jumps & chaotic stutter bursts' },
    { id: 'stutter', label: 'STUTTER', desc: 'Micro-loop chops & rapid rhythmic repeats' },
    { id: 'density', label: 'DENSITY CLOUD', desc: 'Ultra-dense ambient grain smear' },
  ];

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Title & Enable / Freeze bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-3 text-xs">
        <div>
          <span className="font-bold">RED PANDA PARTICLE V2 GRANULAR STEREO DELAY</span>
          <span className="opacity-50 ml-2 hidden md:inline">
            GRANULAR DELAY / PITCH SHIFTER / GLITCH ENGINE
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Enable Toggle */}
          <button
            onClick={() => update({ enabled: !config.enabled })}
            className={`px-3 py-1 border text-xs font-bold cursor-pointer transition-colors ${
              config.enabled
                ? 'bg-current text-black border-current shadow-sm'
                : 'border-current/30 text-current/40 hover:border-current/60'
            }`}
          >
            {config.enabled ? 'ENGINE: ACTIVE' : 'ENGINE: BYPASS'}
          </button>

          {/* Freeze Buffer */}
          <button
            onClick={() => update({ freeze: !config.freeze })}
            className={`px-3 py-1 border text-xs font-bold cursor-pointer transition-colors ${
              config.freeze
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/60 animate-pulse'
                : 'border-current/40 hover:border-current opacity-80'
            }`}
          >
            {config.freeze ? '❄ BUFFER FROZEN' : 'FREEZE BUFFER [F]'}
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div>
        <div className="text-[11px] opacity-60 mb-1.5">ALGORITHM MODE:</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {modes.map((m) => {
            const isSelected = config.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  let updates: Partial<GranularConfig> = { mode: m.id };
                  if (m.id === 'reverse') updates.reverseProb = 85;
                  if (m.id === 'pitch') updates.pitchShift = 12;
                  if (m.id === 'glitch') { updates.randomPitch = 12; updates.reverseProb = 40; }
                  if (m.id === 'stutter') { updates.grainSize = 40; updates.density = 18; }
                  if (m.id === 'density') { updates.grainSize = 250; updates.density = 15; }
                  update(updates);
                }}
                className={`p-2 border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-current bg-current/15 font-bold shadow-sm'
                    : 'border-current/25 hover:border-current/60 bg-black/30 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="text-xs mb-0.5">{isSelected ? '▶ ' : ''}{m.label}</div>
                <div className="text-[10px] opacity-60 leading-tight">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border border-current/25 bg-black/40 p-4">
        {/* Grain Size / Chop */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">GRAIN SIZE (CHOP):</span>
            <span className="font-bold tabular-nums">{config.grainSize.toFixed(0)} ms</span>
          </div>
          <input
            type="range"
            min="15"
            max="450"
            step="5"
            value={config.grainSize}
            onChange={(e) => update({ grainSize: parseFloat(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-50 font-mono">
            {renderAsciiSlider(config.grainSize, 15, 450, 16, 'fill')}
          </div>
        </div>

        {/* Grain Density / Overlap */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">DENSITY (RATE):</span>
            <span className="font-bold tabular-nums">{config.density} grains/sec</span>
          </div>
          <input
            type="range"
            min="1"
            max="24"
            step="1"
            value={config.density}
            onChange={(e) => update({ density: parseInt(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-50 font-mono">
            {renderAsciiSlider(config.density, 1, 24, 16, 'meter')}
          </div>
        </div>

        {/* Pitch Shift (Semitones) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">PITCH SHIFT:</span>
            <span className="font-bold tabular-nums">
              {config.pitchShift > 0 ? `+${config.pitchShift}` : config.pitchShift} semitones
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            step="1"
            value={config.pitchShift}
            onChange={(e) => update({ pitchShift: parseInt(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] opacity-60">
            <button onClick={() => update({ pitchShift: -12 })} className="hover:underline cursor-pointer">-1 Oct</button>
            <button onClick={() => update({ pitchShift: -7 })} className="hover:underline cursor-pointer">-5th</button>
            <button onClick={() => update({ pitchShift: 0 })} className="hover:underline cursor-pointer">Unison</button>
            <button onClick={() => update({ pitchShift: 7 })} className="hover:underline cursor-pointer">+5th</button>
            <button onClick={() => update({ pitchShift: 12 })} className="hover:underline cursor-pointer">+1 Oct</button>
          </div>
        </div>

        {/* Delay Buffer Time */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">DELAY TIME:</span>
            <span className="font-bold tabular-nums">{config.delayTime.toFixed(0)} ms</span>
          </div>
          <input
            type="range"
            min="30"
            max="1500"
            step="10"
            value={config.delayTime}
            onChange={(e) => update({ delayTime: parseFloat(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-50 font-mono">
            {renderAsciiSlider(config.delayTime, 30, 1500, 16, 'thumb')}
          </div>
        </div>

        {/* Feedback */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">FEEDBACK:</span>
            <span className="font-bold tabular-nums">{(config.feedback * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.01"
            value={config.feedback}
            onChange={(e) => update({ feedback: parseFloat(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-50 font-mono">
            {renderAsciiSlider(config.feedback, 0, 0.95, 16, 'fill')}
          </div>
        </div>

        {/* Dry / Wet Mix */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">MIX (DRY / WET):</span>
            <span className="font-bold tabular-nums">{(config.mix * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.mix}
            onChange={(e) => update({ mix: parseFloat(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-50 font-mono">
            {renderAsciiSlider(config.mix, 0, 1, 16, 'fill')}
          </div>
        </div>

        {/* Random Pitch Jitter / Spray */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">RANDOM PITCH JUMP:</span>
            <span className="font-bold tabular-nums">{config.randomPitch} st</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={config.randomPitch}
            onChange={(e) => update({ randomPitch: parseInt(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-60">Random harmonic pitch leaps</div>
        </div>

        {/* Spray / Timing Jitter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">SPRAY (TIME JITTER):</span>
            <span className="font-bold tabular-nums">{config.spray.toFixed(0)} ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            step="2"
            value={config.spray}
            onChange={(e) => update({ spray: parseFloat(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-60">Diffusion &amp; position randomization</div>
        </div>

        {/* Reverse Grain Probability */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">REVERSE PROBABILITY:</span>
            <span className="font-bold tabular-nums">{config.reverseProb.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={config.reverseProb}
            onChange={(e) => update({ reverseProb: parseFloat(e.target.value) })}
            className="w-full accent-current cursor-pointer"
          />
          <div className="text-[10px] opacity-60">Percent of grains played backwards</div>
        </div>
      </div>

      {/* Particle Delay Topology Info */}
      <div className="p-3 border border-current/20 bg-current/5 text-xs opacity-75 leading-relaxed space-y-1">
        <div className="font-bold text-[11px]">RED PANDA PARTICLE ARCHITECTURE:</div>
        <p className="text-[11px]">
          Particle chops your analog waveforms into minute temporal windows (grains), then repositions them in time, modulates their playback velocity (pitch shifting or reversal), spreads them across the stereo panorama with Hann window envelopes, and feeds them back into a 4-second circulating tape memory.
        </p>
      </div>
    </div>
  );
};
