import React from 'react';
import { OscillatorConfig } from '../types/synth';
import { renderAsciiSlider } from '../utils/tuiPlots';

interface OscillatorsPaneProps {
  oscillators: OscillatorConfig[];
  onChange: (configs: OscillatorConfig[]) => void;
  selectedOscIndex: number;
  onSelectOsc: (index: number) => void;
}

// Helper to convert Hz to musical note (e.g., 440 -> A4)
function hzToNote(freq: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const semitonesFromA4 = Math.round(12 * Math.log2(freq / 440));
  const midi = 69 + semitonesFromA4;
  const note = notes[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export const OscillatorsPane: React.FC<OscillatorsPaneProps> = ({
  oscillators,
  onChange,
  selectedOscIndex,
  onSelectOsc,
}) => {
  const updateOsc = (index: number, updates: Partial<OscillatorConfig>) => {
    const updated = [...oscillators];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const getWaveSymbol = (waveform: OscillatorConfig['waveform']) => {
    switch (waveform) {
      case 'sine': return '∿ SINE';
      case 'sawtooth': return '⩕ SAWTOOTH';
      case 'triangle': return '⋀ TRIANGLE';
      case 'square': return '⊓ SQUARE';
    }
  };

  return (
    <div className="space-y-4 font-mono select-none">
      <div className="flex items-center justify-between text-xs opacity-75 border-b border-current/10 pb-2">
        <div>
          <span>4-VOICE INDEPENDENT ANALOG WAVE GENERATORS</span>
          <span className="opacity-50 ml-2">[HOTKEYS: 1, 2, 3, 4]</span>
        </div>
        <div className="text-[11px] opacity-60">
          ANALOG CIRCUIT DRIFT &amp; TEMPERATURE FLUCTUATION ENABLED
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {oscillators.map((osc, idx) => {
          const isSelected = selectedOscIndex === idx;
          const noteStr = hzToNote(osc.freq * Math.pow(2, osc.octave) * Math.pow(2, osc.fine / 1200));

          return (
            <div
              key={osc.id}
              onClick={() => onSelectOsc(idx)}
              className={`p-3.5 border transition-all cursor-pointer ${
                isSelected
                  ? 'border-current bg-current/5 shadow-sm'
                  : 'border-current/30 hover:border-current/60 bg-black/40'
              }`}
            >
              {/* Header: Name, Waveform badge, Mute & Solo */}
              <div className="flex items-center justify-between border-b border-current/20 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {isSelected ? '▶ ' : '  '}
                    {osc.name}
                  </span>
                  <span className="px-1.5 py-0.5 border border-current/40 text-[10px] font-bold">
                    {getWaveSymbol(osc.waveform)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Enabled / Mute toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOsc(idx, { enabled: !osc.enabled });
                    }}
                    className={`px-2 py-0.5 border text-[11px] font-bold cursor-pointer transition-colors ${
                      osc.enabled
                        ? 'bg-current text-black border-current'
                        : 'border-current/30 text-current/40'
                    }`}
                  >
                    {osc.enabled ? 'ON' : 'MUTE'}
                  </button>

                  {/* Solo toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOsc(idx, { solo: !osc.solo });
                    }}
                    className={`px-2 py-0.5 border text-[11px] font-bold cursor-pointer transition-colors ${
                      osc.solo
                        ? 'border-yellow-400 text-yellow-300 bg-yellow-950/40'
                        : 'border-current/30 text-current/40'
                    }`}
                  >
                    SOLO
                  </button>
                </div>
              </div>

              {/* Parameter Controls */}
              <div className="space-y-3 text-xs">
                {/* Frequency & Octave */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="opacity-80">FREQ:</span>
                    <span className="font-bold">
                      {osc.freq.toFixed(1)} Hz <span className="opacity-60">({noteStr})</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-40 text-[10px]">20Hz</span>
                    <input
                      type="range"
                      min="20"
                      max="1200"
                      step="0.5"
                      value={osc.freq}
                      onChange={(e) => updateOsc(idx, { freq: parseFloat(e.target.value) })}
                      className="w-full accent-current cursor-pointer"
                    />
                    <span className="opacity-40 text-[10px]">1.2kHz</span>
                  </div>
                </div>

                {/* Octave & Fine Tune Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="opacity-70">OCTAVE:</span>
                      <span className="font-bold">{osc.octave > 0 ? `+${osc.octave}` : osc.octave}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[-2, -1, 0, 1, 2].map((oct) => (
                        <button
                          key={oct}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOsc(idx, { octave: oct });
                          }}
                          className={`flex-1 py-0.5 border text-[10px] cursor-pointer ${
                            osc.octave === oct
                              ? 'bg-current text-black font-bold border-current'
                              : 'border-current/25 hover:border-current/60'
                          }`}
                        >
                          {oct > 0 ? `+${oct}` : oct}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="opacity-70">FINE TUNE:</span>
                      <span className="font-bold">{osc.fine > 0 ? `+${osc.fine}` : osc.fine}c</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={osc.fine}
                      onChange={(e) => updateOsc(idx, { fine: parseInt(e.target.value) })}
                      className="w-full accent-current cursor-pointer"
                    />
                  </div>
                </div>

                {/* Gain & Pan */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="opacity-70">GAIN:</span>
                      <span className="font-bold">{(osc.gain * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={osc.gain}
                        onChange={(e) => updateOsc(idx, { gain: parseFloat(e.target.value) })}
                        className="w-full accent-current cursor-pointer"
                      />
                    </div>
                    <div className="text-[10px] opacity-60 mt-0.5 font-mono">
                      {renderAsciiSlider(osc.gain, 0, 1, 10, 'fill')}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="opacity-70">STEREO PAN:</span>
                      <span className="font-bold">
                        {osc.pan === 0 ? 'CENTER' : osc.pan < 0 ? `L ${Math.abs(Math.round(osc.pan * 100))}%` : `R ${Math.round(osc.pan * 100)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={osc.pan}
                      onChange={(e) => updateOsc(idx, { pan: parseFloat(e.target.value) })}
                      className="w-full accent-current cursor-pointer"
                    />
                    <div className="text-[10px] opacity-60 mt-0.5 font-mono">
                      {renderAsciiSlider(osc.pan, -1, 1, 10, 'thumb')}
                    </div>
                  </div>
                </div>

                {/* Analog Circuit Drift & Temperature Flutter */}
                <div className="pt-2 border-t border-current/10">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="opacity-70">ANALOG DRIFT / FLUTTER:</span>
                    <span className="opacity-90">
                      RATE: <span className="font-bold">{osc.driftRate.toFixed(2)}Hz</span> · DEPTH: <span className="font-bold">{osc.driftDepth.toFixed(0)}c</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="range"
                      min="0.05"
                      max="3.0"
                      step="0.05"
                      value={osc.driftRate}
                      onChange={(e) => updateOsc(idx, { driftRate: parseFloat(e.target.value) })}
                      className="w-full accent-current cursor-pointer"
                    />
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.5"
                      value={osc.driftDepth}
                      onChange={(e) => updateOsc(idx, { driftDepth: parseFloat(e.target.value) })}
                      className="w-full accent-current cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
