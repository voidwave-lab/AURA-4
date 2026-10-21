// SPDX-License-Identifier: GPL-3.0-or-later
import React, { useState, useEffect } from 'react';
import {
  LfoMatrixConfig,
  LfoUnitConfig,
  ModulationRoute,
  ModulationDestination,
  LfoWaveform,
} from '../types/synth';
import { audioEngine } from '../audio/AudioEngine';
import { renderAsciiSlider } from '../utils/tuiPlots';
import { Activity, Plus, Trash2, Sparkles, Sliders } from 'lucide-react';

interface LfoMatrixPaneProps {
  config: LfoMatrixConfig;
  onChange: (config: LfoMatrixConfig) => void;
}

const DESTINATION_LABELS: Record<ModulationDestination, string> = {
  osc1_pitch: 'OSC 1 PITCH (Hz)',
  osc2_pitch: 'OSC 2 PITCH (Hz)',
  osc3_pitch: 'OSC 3 PITCH (Hz)',
  osc4_pitch: 'OSC 4 PITCH (Hz)',
  fm_1_2: 'FM 1→2 MOD DEPTH',
  fm_2_3: 'FM 2→3 MOD DEPTH',
  fm_3_4: 'FM 3→4 MOD DEPTH',
  filter_cutoff: 'FILTER CUTOFF FREQ',
  filter_resonance: 'FILTER RESONANCE (Q)',
  particle_size: 'PARTICLE GRAIN CHOP',
  particle_pitch: 'PARTICLE PITCH SHIFT',
  delay_time: 'TAPE DELAY TIME (WOW)',
  chorus_rate: 'STEREO CHORUS RATE',
  reverb_mix: 'REVERB WET MIX',
  stereo_pan: 'STEREO AUTO-PAN',
};

const WAVEFORM_SYMBOLS: Record<LfoWaveform, string> = {
  sine: '∿ SINE',
  triangle: '⋀ TRIANGLE',
  sawtooth: '⩕ SAW',
  square: '⊓ SQUARE',
  random: '⚄ S&H RANDOM',
};

export const LfoMatrixPane: React.FC<LfoMatrixPaneProps> = ({ config, onChange }) => {
  const [telemetry, setTelemetry] = useState<number[]>([0, 0, 0, 0]);

  // Poll live LFO positions for real-time ASCII gauges
  useEffect(() => {
    let animId: number;
    const update = () => {
      setTelemetry(audioEngine.getLfoTelemetry());
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  const updateLfo = (id: number, updates: Partial<LfoUnitConfig>) => {
    const updatedLfos = config.lfos.map((l) => (l.id === id ? { ...l, ...updates } : l));
    const newConfig = { ...config, lfos: updatedLfos };
    onChange(newConfig);
    audioEngine.updateLfoMatrix(newConfig);
  };

  const updateRoute = (routeId: string, updates: Partial<ModulationRoute>) => {
    const updatedRoutes = config.routes.map((r) => (r.id === routeId ? { ...r, ...updates } : r));
    const newConfig = { ...config, routes: updatedRoutes };
    onChange(newConfig);
    audioEngine.updateLfoMatrix(newConfig);
  };

  const addRoute = () => {
    const newRoute: ModulationRoute = {
      id: `r_${Date.now()}`,
      sourceLfoId: 1,
      destination: 'filter_cutoff',
      amount: 0.5,
      enabled: true,
    };
    const newConfig = { ...config, routes: [...config.routes, newRoute] };
    onChange(newConfig);
    audioEngine.updateLfoMatrix(newConfig);
  };

  const removeRoute = (routeId: string) => {
    const newConfig = {
      ...config,
      routes: config.routes.filter((r) => r.id !== routeId),
    };
    onChange(newConfig);
    audioEngine.updateLfoMatrix(newConfig);
  };

  const applyPresetMatrix = (preset: 'breathe' | 'chaos' | 'tape' | 'fm_swarm' | 'clear') => {
    let newLfos = [...config.lfos];
    let newRoutes: ModulationRoute[] = [];

    if (preset === 'breathe') {
      newLfos[0] = { ...newLfos[0], enabled: true, waveform: 'sine', rate: 0.08, depth: 0.85 };
      newLfos[1] = { ...newLfos[1], enabled: true, waveform: 'triangle', rate: 0.15, depth: 0.6 };
      newRoutes = [
        { id: 'b1', sourceLfoId: 1, destination: 'filter_cutoff', amount: 0.75, enabled: true },
        { id: 'b2', sourceLfoId: 2, destination: 'osc2_pitch', amount: 0.15, enabled: true },
        { id: 'b3', sourceLfoId: 1, destination: 'reverb_mix', amount: 0.35, enabled: true },
      ];
    } else if (preset === 'chaos') {
      newLfos[3] = { ...newLfos[3], enabled: true, waveform: 'random', rate: 1.8, depth: 0.9 };
      newRoutes = [
        { id: 'c1', sourceLfoId: 4, destination: 'fm_1_2', amount: 0.8, enabled: true },
        { id: 'c2', sourceLfoId: 4, destination: 'particle_pitch', amount: 0.7, enabled: true },
        { id: 'c3', sourceLfoId: 4, destination: 'filter_resonance', amount: 0.5, enabled: true },
      ];
    } else if (preset === 'tape') {
      newLfos[2] = { ...newLfos[2], enabled: true, waveform: 'triangle', rate: 0.3, depth: 0.65 };
      newLfos[0] = { ...newLfos[0], enabled: true, waveform: 'sine', rate: 0.12, depth: 0.7 };
      newRoutes = [
        { id: 't1', sourceLfoId: 3, destination: 'delay_time', amount: 0.6, enabled: true },
        { id: 't2', sourceLfoId: 1, destination: 'stereo_pan', amount: 0.8, enabled: true },
        { id: 't3', sourceLfoId: 1, destination: 'chorus_rate', amount: 0.4, enabled: true },
      ];
    } else if (preset === 'fm_swarm') {
      newLfos[0] = { ...newLfos[0], enabled: true, waveform: 'sawtooth', rate: 0.25, depth: 0.8 };
      newLfos[1] = { ...newLfos[1], enabled: true, waveform: 'triangle', rate: 0.45, depth: 0.85 };
      newRoutes = [
        { id: 'f1', sourceLfoId: 1, destination: 'fm_1_2', amount: 0.75, enabled: true },
        { id: 'f2', sourceLfoId: 2, destination: 'fm_2_3', amount: 0.65, enabled: true },
        { id: 'f3', sourceLfoId: 1, destination: 'fm_3_4', amount: 0.5, enabled: true },
      ];
    }

    const newConfig = { lfos: newLfos, routes: newRoutes };
    onChange(newConfig);
    audioEngine.updateLfoMatrix(newConfig);
  };

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Top Banner & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-2 text-xs">
        <div>
          <span className="font-bold">LFO MODULATION MATRIX &amp; MACRO AUTOMATION</span>
          <span className="opacity-50 ml-2 hidden sm:inline">
            4 MULTI-WAVE LFOS ROUTED TO PITCH, FM INDICES &amp; EFFECT PARAMS
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="opacity-50 text-[11px]">PRESETS:</span>
          <button
            onClick={() => applyPresetMatrix('breathe')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            COSMIC BREATHE
          </button>
          <button
            onClick={() => applyPresetMatrix('chaos')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            S&amp;H MODULAR CHAOS
          </button>
          <button
            onClick={() => applyPresetMatrix('tape')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            TAPE WOW &amp; PAN
          </button>
          <button
            onClick={() => applyPresetMatrix('fm_swarm')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            FM SWARM
          </button>
          <button
            onClick={() => applyPresetMatrix('clear')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] opacity-60 hover:opacity-100 cursor-pointer"
          >
            CLEAR ALL
          </button>
        </div>
      </div>

      {/* 4 LFO Generator Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {config.lfos.map((lfo, idx) => {
          const liveVal = telemetry[idx] || 0;
          const gauge = renderAsciiSlider(liveVal, -1, 1, 12, 'thumb');

          return (
            <div
              key={lfo.id}
              className={`p-3 border transition-all ${
                lfo.enabled
                  ? 'border-current/40 bg-black/50 shadow-sm'
                  : 'border-current/20 bg-black/20 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between border-b border-current/20 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className={lfo.enabled ? 'animate-pulse' : 'opacity-40'} />
                  <span className="font-bold text-xs">{lfo.name}</span>
                </div>
                <button
                  onClick={() => updateLfo(lfo.id, { enabled: !lfo.enabled })}
                  className={`px-1.5 py-0.2 border text-[10px] font-bold cursor-pointer ${
                    lfo.enabled ? 'bg-current text-black border-current' : 'border-current/30 opacity-50'
                  }`}
                >
                  {lfo.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Real-time Oscillating Value Gauge */}
              <div className="mb-2.5 text-[10px] flex items-center justify-between opacity-80 font-mono">
                <span>VAL: <strong className="font-bold">{liveVal > 0 ? `+${liveVal.toFixed(2)}` : liveVal.toFixed(2)}</strong></span>
                <span className="text-[9px]">{gauge}</span>
              </div>

              {/* Waveform Selector */}
              <div className="mb-2">
                <div className="text-[10px] opacity-60 mb-1">WAVEFORM:</div>
                <select
                  value={lfo.waveform}
                  onChange={(e) => updateLfo(lfo.id, { waveform: e.target.value as LfoWaveform })}
                  className="w-full bg-black border border-current/30 text-[11px] p-1 font-mono text-current cursor-pointer"
                >
                  {(['sine', 'triangle', 'sawtooth', 'square', 'random'] as LfoWaveform[]).map((w) => (
                    <option key={w} value={w} className="bg-black text-current">
                      {WAVEFORM_SYMBOLS[w]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate & Depth */}
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="opacity-70">RATE (FREQ):</span>
                    <span className="font-bold tabular-nums">
                      {lfo.rate < 1 ? `${lfo.rate.toFixed(2)} Hz` : `${lfo.rate.toFixed(1)} Hz`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="10.0"
                    step="0.02"
                    value={lfo.rate}
                    onChange={(e) => updateLfo(lfo.id, { rate: parseFloat(e.target.value) })}
                    className="w-full accent-current cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="opacity-70">MASTER DEPTH:</span>
                    <span className="font-bold tabular-nums">{(lfo.depth * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={lfo.depth}
                    onChange={(e) => updateLfo(lfo.id, { depth: parseFloat(e.target.value) })}
                    className="w-full accent-current cursor-pointer"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modulation Routing Matrix Table */}
      <div className="border border-current/30 bg-black/60 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-current/20 pb-2">
          <div className="flex items-center gap-2">
            <Sliders size={14} />
            <span className="font-bold text-xs">ACTIVE MODULATION ROUTINGS ({config.routes.length})</span>
          </div>

          <button
            onClick={addRoute}
            className="px-2.5 py-1 border border-current bg-current text-black font-bold text-xs flex items-center gap-1 cursor-pointer hover:opacity-90"
          >
            <Plus size={12} />
            <span>ADD ROUTE</span>
          </button>
        </div>

        {config.routes.length === 0 ? (
          <div className="py-6 text-center text-xs opacity-50 border border-dashed border-current/20">
            NO ACTIVE MODULATION ROUTES. CLICK "+ ADD ROUTE" OR LOAD A PRESET ABOVE.
          </div>
        ) : (
          <div className="space-y-2">
            {config.routes.map((route, rIdx) => {
              const srcLfo = config.lfos.find((l) => l.id === route.sourceLfoId);
              const liveVal = (telemetry[route.sourceLfoId - 1] || 0) * route.amount;

              return (
                <div
                  key={route.id}
                  className={`p-2.5 border transition-all flex flex-wrap items-center justify-between gap-3 ${
                    route.enabled
                      ? 'border-current/30 bg-black/40'
                      : 'border-current/15 bg-black/10 opacity-50'
                  }`}
                >
                  {/* Route Index & Source LFO */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateRoute(route.id, { enabled: !route.enabled })}
                      className={`px-1.5 py-0.5 border text-[10px] font-bold cursor-pointer ${
                        route.enabled ? 'bg-current text-black border-current' : 'border-current/30 opacity-40'
                      }`}
                    >
                      {route.enabled ? 'ON' : 'MUTED'}
                    </button>

                    <div className="text-xs font-bold flex items-center gap-1">
                      <span className="opacity-40">#{rIdx + 1}</span>
                      <select
                        value={route.sourceLfoId}
                        onChange={(e) => updateRoute(route.id, { sourceLfoId: parseInt(e.target.value) })}
                        className="bg-black border border-current/30 text-xs px-1 py-0.5 font-mono text-current cursor-pointer"
                      >
                        {config.lfos.map((l) => (
                          <option key={l.id} value={l.id} className="bg-black text-current">
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Destination Selector */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="opacity-50">──► TARGET:</span>
                    <select
                      value={route.destination}
                      onChange={(e) => updateRoute(route.id, { destination: e.target.value as ModulationDestination })}
                      className="bg-black border border-current/30 text-xs px-1.5 py-0.5 font-mono text-current cursor-pointer max-w-[200px]"
                    >
                      {(Object.keys(DESTINATION_LABELS) as ModulationDestination[]).map((dest) => (
                        <option key={dest} value={dest} className="bg-black text-current">
                          {DESTINATION_LABELS[dest]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bipolar Amount Slider & Live Meter */}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-[10px] opacity-60">DEPTH:</span>
                    <input
                      type="range"
                      min="-1.0"
                      max="1.0"
                      step="0.02"
                      value={route.amount}
                      onChange={(e) => updateRoute(route.id, { amount: parseFloat(e.target.value) })}
                      className="w-full accent-current cursor-pointer"
                    />
                    <span className="font-bold text-xs tabular-nums min-w-[45px] text-right">
                      {route.amount > 0 ? `+${(route.amount * 100).toFixed(0)}%` : `${(route.amount * 100).toFixed(0)}%`}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeRoute(route.id)}
                    className="p-1 border border-current/25 hover:border-red-400 hover:text-red-400 opacity-60 hover:opacity-100 cursor-pointer"
                    title="Remove route"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guidance Callout */}
      <div className="p-3 border border-current/20 bg-current/5 text-xs opacity-75 leading-relaxed space-y-1">
        <div className="font-bold text-[11px]">MODULATION MATRIX PRINCIPLES:</div>
        <p className="text-[11px]">
          LFOs introduce continuous cyclic or stochastic movement into the synthesis graph. Routing LFO 1 to Filter Cutoff creates slow breathing sweeps; routing LFO 2 to FM modulation index creates glassy harmonic fluctuations; routing LFO 4 (Sample &amp; Hold) to Particle Pitch shifts audio slices into erratic glitch cascades.
        </p>
      </div>
    </div>
  );
};
