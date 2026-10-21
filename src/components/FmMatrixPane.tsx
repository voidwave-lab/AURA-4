// SPDX-License-Identifier: GPL-3.0-or-later
import React from 'react';
import { FmMatrix, OscillatorConfig } from '../types/synth';

interface FmMatrixPaneProps {
  fmMatrix: FmMatrix;
  onChange: (matrix: FmMatrix) => void;
  oscillators: OscillatorConfig[];
}

export const FmMatrixPane: React.FC<FmMatrixPaneProps> = ({
  fmMatrix,
  onChange,
  oscillators,
}) => {
  const updateCell = (mod: number, car: number, val: number) => {
    const updated = fmMatrix.map((row) => [...row]);
    updated[mod][car] = Math.max(0, Math.min(800, val));
    onChange(updated);
  };

  const applyAlgorithm = (algo: 'cascade' | 'cross' | 'bells' | 'feedback' | 'clear') => {
    let newMatrix: FmMatrix = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    if (algo === 'cascade') {
      // 1 -> 2 -> 3 -> 4
      newMatrix = [
        [0, 45, 0, 0],
        [0, 0, 75, 0],
        [0, 0, 0, 110],
        [0, 0, 0, 0],
      ];
    } else if (algo === 'cross') {
      // Buchla 259 dual cross FM
      newMatrix = [
        [0, 120, 0, 0],
        [160, 0, 0, 0],
        [0, 0, 0, 95],
        [0, 0, 140, 0],
      ];
    } else if (algo === 'bells') {
      // Inharmonic FM bell tones
      newMatrix = [
        [0, 240, 180, 0],
        [0, 0, 0, 90],
        [0, 0, 0, 130],
        [0, 0, 0, 0],
      ];
    } else if (algo === 'feedback') {
      // Circular chaotic ring
      newMatrix = [
        [0, 80, 0, 0],
        [0, 0, 80, 0],
        [0, 0, 0, 80],
        [80, 0, 0, 0],
      ];
    }
    onChange(newMatrix);
  };

  return (
    <div className="space-y-5 font-mono select-none">
      {/* Overview & Algorithm Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-3 text-xs">
        <div>
          <span className="font-bold">4x4 AUDIO-RATE FM MODULATION MATRIX</span>
          <span className="opacity-60 ml-2 hidden sm:inline">
            (Rows = Modulators, Columns = Carriers)
          </span>
        </div>

        {/* Algorithm quick buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="opacity-50 text-[11px]">ALGORITHMS:</span>
          <button
            onClick={() => applyAlgorithm('cascade')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            CASCADE (1→2→3→4)
          </button>
          <button
            onClick={() => applyAlgorithm('cross')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            BUCHLA CROSS-FM
          </button>
          <button
            onClick={() => applyAlgorithm('bells')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            BELL CHIMES
          </button>
          <button
            onClick={() => applyAlgorithm('feedback')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
          >
            CHAOS RING
          </button>
          <button
            onClick={() => applyAlgorithm('clear')}
            className="px-2 py-0.5 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] opacity-60 hover:opacity-100 cursor-pointer"
          >
            ZERO ALL
          </button>
        </div>
      </div>

      {/* 4x4 Grid Container */}
      <div className="border border-current/30 bg-black/40 p-4 overflow-x-auto">
        <div className="min-w-[620px]">
          {/* Header Row: Carriers */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs pb-3 border-b border-current/20">
            <div className="text-left font-bold opacity-60 flex items-center">
              MOD \ CARRIER
            </div>
            {oscillators.map((c) => (
              <div key={c.id} className="font-bold border border-current/25 py-1 px-1 bg-current/5">
                <div className="text-[11px]">{c.name.split(' ')[0]} {c.name.split(' ')[1]}</div>
                <div className="text-[10px] opacity-60 uppercase">{c.waveform.substring(0, 4)}</div>
              </div>
            ))}
          </div>

          {/* Matrix Rows: Modulators */}
          <div className="divide-y divide-current/10 pt-2">
            {oscillators.map((modOsc, mIdx) => (
              <div key={modOsc.id} className="grid grid-cols-5 gap-2 items-center py-2.5">
                {/* Modulator Label */}
                <div className="text-xs font-bold flex items-center gap-1.5 pr-2">
                  <span className="opacity-40">M{mIdx + 1}:</span>
                  <span>{modOsc.name.split(' ')[1]}</span>
                  <span className="text-[10px] opacity-50 uppercase">[{modOsc.waveform.substring(0, 3)}]</span>
                </div>

                {/* 4 Carrier Cells */}
                {oscillators.map((carOsc, cIdx) => {
                  const depth = fmMatrix[mIdx]?.[cIdx] ?? 0;
                  const isActive = depth > 0;
                  const isSelfMod = mIdx === cIdx;

                  return (
                    <div
                      key={carOsc.id}
                      className={`p-2 border text-center transition-all ${
                        isActive
                          ? 'border-current bg-current/10'
                          : 'border-current/20 hover:border-current/40 bg-black/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className={`text-[10px] ${isSelfMod ? 'text-amber-300 font-bold' : 'opacity-60'}`}>
                          {isSelfMod ? 'SELF' : `→ C${cIdx + 1}`}
                        </span>
                        <span className="font-bold tabular-nums">
                          {depth.toFixed(0)} <span className="opacity-50 text-[9px]">Hz</span>
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="400"
                        step="2"
                        value={depth}
                        onChange={(e) => updateCell(mIdx, cIdx, parseFloat(e.target.value))}
                        className="w-full accent-current cursor-pointer h-1.5"
                      />

                      <div className="flex items-center justify-between text-[9px] opacity-40 mt-1">
                        <button
                          onClick={() => updateCell(mIdx, cIdx, 0)}
                          className="hover:underline cursor-pointer"
                        >
                          0
                        </button>
                        <button
                          onClick={() => updateCell(mIdx, cIdx, 50)}
                          className="hover:underline cursor-pointer"
                        >
                          50
                        </button>
                        <button
                          onClick={() => updateCell(mIdx, cIdx, 150)}
                          className="hover:underline cursor-pointer"
                        >
                          150
                        </button>
                        <button
                          onClick={() => updateCell(mIdx, cIdx, 300)}
                          className="hover:underline cursor-pointer"
                        >
                          300
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Synthesis Guide Callout */}
      <div className="p-3 border border-current/20 bg-current/5 text-xs space-y-1 opacity-80 leading-relaxed">
        <div className="font-bold text-[11px] tracking-wide">
          MODULATION TOPOLOGY PRINCIPLES:
        </div>
        <p className="text-[11px]">
          Frequency Modulation creates sideband spectra around carrier frequencies. Modulating Sine by Sawtooth produces bright metallic overtones; modulating Triangle by Square produces sharp, aggressive glassy textures. Self-modulation creates complex chaotic wave fold distortion.
        </p>
      </div>
    </div>
  );
};
