// SPDX-License-Identifier: GPL-3.0-or-later
import React from 'react';
import { Preset, OscillatorConfig, FmMatrix, GranularConfig, EffectsConfig } from '../types/synth';
import { PRESETS, AMBIENT_SCALES } from '../data/presets';
import { Sparkles, Sliders, Music } from 'lucide-react';

interface PresetsPaneProps {
  currentPresetId: string;
  onLoadPreset: (preset: Preset) => void;
  oscillators: OscillatorConfig[];
  onUpdateOscillators: (configs: OscillatorConfig[]) => void;
  onMutate: () => void;
}

export const PresetsPane: React.FC<PresetsPaneProps> = ({
  currentPresetId,
  onLoadPreset,
  oscillators,
  onUpdateOscillators,
  onMutate,
}) => {
  const applyScale = (scale: typeof AMBIENT_SCALES[0]) => {
    const updated = oscillators.map((osc, i) => {
      const ratio = scale.ratios[i % scale.ratios.length];
      const targetFreq = scale.root * ratio;
      return {
        ...osc,
        freq: parseFloat(targetFreq.toFixed(2)),
        octave: 0,
        fine: 0,
      };
    });
    onUpdateOscillators(updated);
  };

  return (
    <div className="space-y-5 font-mono select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-2 text-xs">
        <div>
          <span className="font-bold">AMBIENT SOUND DESIGN PRESETS &amp; DRONE SCALES</span>
          <span className="opacity-50 ml-2 hidden sm:inline">[PRESS P TO CYCLE PRESETS]</span>
        </div>
        <button
          onClick={onMutate}
          className="px-3 py-1 border border-current hover:bg-current hover:text-black font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
        >
          <Sparkles size={13} />
          <span>RANDOMIZE / MUTATE SOUNDSCAPE [M]</span>
        </button>
      </div>

      {/* Preset Cards Grid */}
      <div>
        <div className="text-[11px] opacity-60 mb-2">CURATED SOUNDSCAPE PATCHES:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESETS.map((p) => {
            const isCurrent = currentPresetId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onLoadPreset(p)}
                className={`p-3.5 border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-current bg-current/15 shadow-sm'
                    : 'border-current/30 hover:border-current/70 bg-black/40'
                }`}
              >
                <div className="flex items-center justify-between border-b border-current/20 pb-2 mb-2">
                  <span className="font-bold text-xs">{isCurrent ? '▶ ' : ''}{p.name}</span>
                  <span className="text-[10px] uppercase opacity-60 border border-current/30 px-1 py-0.5">
                    {p.category}
                  </span>
                </div>
                <p className="text-[11px] opacity-75 leading-relaxed mb-3">
                  {p.description}
                </p>
                <div className="text-[10px] opacity-60 flex items-center justify-between pt-1 border-t border-current/10">
                  <span>OSC: SINE·SAW·TRI·SQR</span>
                  <span>{isCurrent ? '[LOADED]' : 'CLICK TO LOAD'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ambient Harmonic Scale Tuner */}
      <div className="border border-current/25 bg-black/40 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-current/20 pb-2">
          <div className="flex items-center gap-2">
            <Music size={14} />
            <span className="font-bold text-xs">HARMONIC DRONE CHORD QUANTIZER</span>
          </div>
          <span className="text-[11px] opacity-60">TUNES ALL 4 OSCILLATORS INSTANTLY</span>
        </div>

        <p className="text-xs opacity-75">
          Select a musical tuning system or chord ratio to lock the 4 analog oscillators into a pristine drone harmony:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {AMBIENT_SCALES.map((scale) => (
            <button
              key={scale.name}
              onClick={() => applyScale(scale)}
              className="p-2.5 border border-current/30 hover:border-current hover:bg-current/10 text-left transition-all cursor-pointer"
            >
              <div className="font-bold text-xs mb-1">▶ {scale.name}</div>
              <div className="text-[10px] opacity-60">
                Root: {scale.root} Hz · Ratios: {scale.ratios.join(', ')}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
