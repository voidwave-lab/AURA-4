// SPDX-License-Identifier: GPL-3.0-or-later
import React from 'react';
import { EffectsConfig } from '../types/synth';
import { renderAsciiSlider } from '../utils/tuiPlots';

interface EffectsPaneProps {
  effects: EffectsConfig;
  onChange: (effects: EffectsConfig) => void;
}

export const EffectsPane: React.FC<EffectsPaneProps> = ({ effects, onChange }) => {
  const updateFilter = (updates: Partial<EffectsConfig['filter']>) => {
    onChange({ ...effects, filter: { ...effects.filter, ...updates } });
  };

  const updateChorus = (updates: Partial<EffectsConfig['chorus']>) => {
    onChange({ ...effects, chorus: { ...effects.chorus, ...updates } });
  };

  const updateDelay = (updates: Partial<EffectsConfig['delay']>) => {
    onChange({ ...effects, delay: { ...effects.delay, ...updates } });
  };

  const updateReverb = (updates: Partial<EffectsConfig['reverb']>) => {
    onChange({ ...effects, reverb: { ...effects.reverb, ...updates } });
  };

  const updateMaster = (updates: Partial<EffectsConfig['master']>) => {
    onChange({ ...effects, master: { ...effects.master, ...updates } });
  };

  return (
    <div className="space-y-4 font-mono select-none">
      <div className="flex items-center justify-between text-xs opacity-75 border-b border-current/10 pb-2">
        <div>
          <span className="font-bold">ANALOG EFFECTS RACK &amp; MASTER BUS</span>
          <span className="opacity-50 ml-2">CHORUS · TAPE DELAY · ATMOSPHERIC REVERB · DRIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. MASTER RESONANT FILTER */}
        <div className="p-3.5 border border-current/30 bg-black/40 space-y-3">
          <div className="flex items-center justify-between border-b border-current/20 pb-2">
            <span className="font-bold text-xs">01. ANALOG STATE-VARIABLE FILTER</span>
            <div className="flex items-center gap-1">
              {(['lowpass', 'bandpass', 'highpass'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateFilter({ type: t })}
                  className={`px-1.5 py-0.5 border text-[10px] uppercase cursor-pointer ${
                    effects.filter.type === t
                      ? 'bg-current text-black font-bold border-current'
                      : 'border-current/20 hover:border-current/50 opacity-60'
                  }`}
                >
                  {t.substring(0, 4)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">CUTOFF FREQUENCY:</span>
                <span className="font-bold tabular-nums">
                  {effects.filter.cutoff >= 1000 ? `${(effects.filter.cutoff / 1000).toFixed(2)} kHz` : `${effects.filter.cutoff.toFixed(0)} Hz`}
                </span>
              </div>
              <input
                type="range"
                min="80"
                max="16000"
                step="20"
                value={effects.filter.cutoff}
                onChange={(e) => updateFilter({ cutoff: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
              <div className="text-[10px] opacity-50 font-mono">
                {renderAsciiSlider(effects.filter.cutoff, 80, 16000, 16, 'fill')}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">RESONANCE (Q PEAK):</span>
                <span className="font-bold tabular-nums">{effects.filter.resonance.toFixed(1)} Q</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="12.0"
                step="0.1"
                value={effects.filter.resonance}
                onChange={(e) => updateFilter({ resonance: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2. STEREO CHORUS */}
        <div className="p-3.5 border border-current/30 bg-black/40 space-y-3">
          <div className="flex items-center justify-between border-b border-current/20 pb-2">
            <span className="font-bold text-xs">02. STEREO QUADRATURE CHORUS</span>
            <button
              onClick={() => updateChorus({ enabled: !effects.chorus.enabled })}
              className={`px-2 py-0.5 border text-[11px] font-bold cursor-pointer ${
                effects.chorus.enabled ? 'bg-current text-black border-current' : 'border-current/30 opacity-50'
              }`}
            >
              {effects.chorus.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">LFO RATE:</span>
                  <span className="font-bold tabular-nums">{effects.chorus.rate.toFixed(2)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.05"
                  value={effects.chorus.rate}
                  onChange={(e) => updateChorus({ rate: parseFloat(e.target.value) })}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">DEPTH:</span>
                  <span className="font-bold tabular-nums">{effects.chorus.depth.toFixed(1)} ms</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.2"
                  value={effects.chorus.depth}
                  onChange={(e) => updateChorus({ depth: parseFloat(e.target.value) })}
                  className="w-full accent-current cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">CHORUS MIX:</span>
                <span className="font-bold tabular-nums">{(effects.chorus.mix * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={effects.chorus.mix}
                onChange={(e) => updateChorus({ mix: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
              <div className="text-[10px] opacity-50 font-mono">
                {renderAsciiSlider(effects.chorus.mix, 0, 1, 16, 'fill')}
              </div>
            </div>
          </div>
        </div>

        {/* 3. ANALOG TAPE DELAY */}
        <div className="p-3.5 border border-current/30 bg-black/40 space-y-3">
          <div className="flex items-center justify-between border-b border-current/20 pb-2">
            <span className="font-bold text-xs">03. FILTERED ANALOG TAPE DELAY</span>
            <button
              onClick={() => updateDelay({ enabled: !effects.delay.enabled })}
              className={`px-2 py-0.5 border text-[11px] font-bold cursor-pointer ${
                effects.delay.enabled ? 'bg-current text-black border-current' : 'border-current/30 opacity-50'
              }`}
            >
              {effects.delay.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">DELAY TIME:</span>
                  <span className="font-bold tabular-nums">{effects.delay.time.toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="1200"
                  step="10"
                  value={effects.delay.time}
                  onChange={(e) => updateDelay({ time: parseFloat(e.target.value) })}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">FEEDBACK:</span>
                  <span className="font-bold tabular-nums">{(effects.delay.feedback * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.88"
                  step="0.01"
                  value={effects.delay.feedback}
                  onChange={(e) => updateDelay({ feedback: parseFloat(e.target.value) })}
                  className="w-full accent-current cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">DAMPING:</span>
                  <span className="font-bold tabular-nums">{effects.delay.damping.toFixed(0)} Hz</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="9000"
                  step="100"
                  value={effects.delay.damping}
                  onChange={(e) => updateDelay({ damping: parseFloat(e.target.value) })}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">WOW / FLUTTER:</span>
                  <span className="font-bold tabular-nums">{(effects.delay.wowFlutter * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={effects.delay.wowFlutter}
                  onChange={(e) => updateDelay({ wowFlutter: parseFloat(e.target.value) })}
                  className="w-full accent-current cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">DELAY MIX:</span>
                <span className="font-bold tabular-nums">{(effects.delay.mix * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={effects.delay.mix}
                onChange={(e) => updateDelay({ mix: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4. ATMOSPHERIC SCHROEDER REVERB */}
        <div className="p-3.5 border border-current/30 bg-black/40 space-y-3">
          <div className="flex items-center justify-between border-b border-current/20 pb-2">
            <span className="font-bold text-xs">04. ATMOSPHERIC SCHROEDER REVERB</span>
            <button
              onClick={() => updateReverb({ enabled: !effects.reverb.enabled })}
              className={`px-2 py-0.5 border text-[11px] font-bold cursor-pointer ${
                effects.reverb.enabled ? 'bg-current text-black border-current' : 'border-current/30 opacity-50'
              }`}
            >
              {effects.reverb.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">DECAY TIME:</span>
                <span className="font-bold tabular-nums">{effects.reverb.decay.toFixed(1)} seconds</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="9.5"
                step="0.1"
                value={effects.reverb.decay}
                onChange={(e) => updateReverb({ decay: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
              <div className="text-[10px] opacity-50 font-mono">
                {renderAsciiSlider(effects.reverb.decay, 0.8, 9.5, 16, 'fill')}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">REVERB MIX:</span>
                <span className="font-bold tabular-nums">{(effects.reverb.mix * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={effects.reverb.mix}
                onChange={(e) => updateReverb({ mix: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. MASTER ANALOG SATURATION DRIVE & VOLUME */}
      <div className="p-4 border border-current/35 bg-current/5 space-y-3">
        <div className="flex items-center justify-between border-b border-current/20 pb-2">
          <span className="font-bold text-xs">05. MASTER ANALOG SATURATION (TANH) &amp; LIMITER</span>
          <span className="text-[10px] opacity-60">HYPERBOLIC TANGENT SOFT CLIPPING BUS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="opacity-80">ANALOG TAPE DRIVE / SATURATION:</span>
              <span className="font-bold tabular-nums">{(effects.master.drive * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.02"
              value={effects.master.drive}
              onChange={(e) => updateMaster({ drive: parseFloat(e.target.value) })}
              className="w-full accent-current cursor-pointer"
            />
            <div className="text-[10px] opacity-50 mt-1">
              Provides warm second-harmonic saturation and progressive peak compression
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="opacity-80">MASTER OUTPUT LEVEL:</span>
              <span className="font-bold tabular-nums">{(effects.master.volume * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effects.master.volume}
              onChange={(e) => updateMaster({ volume: parseFloat(e.target.value) })}
              className="w-full accent-current cursor-pointer"
            />
            <div className="text-[10px] opacity-50 mt-1 font-mono">
              {renderAsciiSlider(effects.master.volume, 0, 1, 16, 'meter')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
