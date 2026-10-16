import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { renderBrailleWaveform, renderBlockSpectrum, renderLissajous } from '../utils/tuiPlots';

export const VisualizerPane: React.FC = () => {
  const [scopeLines, setScopeLines] = useState<string[]>([]);
  const [spectrumLines, setSpectrumLines] = useState<string[]>([]);
  const [lissajousLines, setLissajousLines] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'all' | 'scope' | 'spectrum' | 'phase'>('all');
  const [telemetry, setTelemetry] = useState({
    peakDb: -96,
    rmsDb: -96,
    crestFactor: 0,
    estFreq: 0,
  });

  const peakHoldRef = useRef<number[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let lastRenderTime = 0;
    const targetFps = 35; // Fluid terminal update rate without CPU overhead
    const interval = 1000 / targetFps;

    const renderLoop = (time: number) => {
      if (time - lastRenderTime >= interval) {
        lastRenderTime = time;
        const data = audioEngine.getVisualizerData();

        // 1. Oscilloscope Braille plot
        const waveCols = activeView === 'scope' ? 84 : 64;
        const waveRows = activeView === 'scope' ? 14 : 9;
        const scope = renderBrailleWaveform(data.timeDomain, waveCols, waveRows);
        setScopeLines(scope);

        // 2. Frequency Spectrum Block plot
        const specCols = activeView === 'spectrum' ? 80 : 48;
        const specRows = activeView === 'spectrum' ? 12 : 7;
        const spec = renderBlockSpectrum(data.frequency, specCols, specRows, peakHoldRef.current);
        setSpectrumLines(spec);

        // 3. Lissajous Scope
        if (activeView === 'all' || activeView === 'phase') {
          const liss = renderLissajous(data.leftBuffer, data.rightBuffer, 28, 9);
          setLissajousLines(liss);
        }

        // 4. Calculate signal statistics
        const peak = Math.max(0.0001, data.peak);
        const rms = Math.max(0.0001, data.rms);
        const peakDb = 20 * Math.log10(peak);
        const rmsDb = 20 * Math.log10(rms);
        const crestFactor = peak / rms;

        // Simple zero-crossing frequency estimation
        let zeroCrossings = 0;
        for (let i = 0; i < data.timeDomain.length - 1; i++) {
          if (data.timeDomain[i] < 0 && data.timeDomain[i + 1] >= 0) {
            zeroCrossings++;
          }
        }
        const estFreq = Math.round((zeroCrossings * 44100) / data.timeDomain.length);

        setTelemetry({
          peakDb: Math.max(-96, Math.min(0, peakDb)),
          rmsDb: Math.max(-96, Math.min(0, rmsDb)),
          crestFactor: parseFloat(crestFactor.toFixed(2)),
          estFreq: Math.min(5000, estFreq),
        });
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeView]);

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Visualizer Mode Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold">REAL-TIME CHARACTER-BASED WAVEFORM PLOTS</span>
          <span className="opacity-50 hidden sm:inline">[UNICODE BRAILLE U+2800 &amp; BLOCK ELEMENTS]</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="opacity-50 text-[11px] mr-1">VIEW:</span>
          {(['all', 'scope', 'spectrum', 'phase'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveView(mode)}
              className={`px-2 py-0.5 border text-[11px] uppercase cursor-pointer ${
                activeView === mode
                  ? 'bg-current text-black font-bold border-current'
                  : 'border-current/25 hover:border-current/60 opacity-60'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Telemetry Meter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-2.5 border border-current/25 bg-current/5 text-xs">
        <div>
          <span className="opacity-60 text-[10px] block">PEAK LEVEL</span>
          <span className="font-bold tabular-nums">
            {telemetry.peakDb <= -90 ? '-INF' : `${telemetry.peakDb.toFixed(1)} dBFS`}
          </span>
        </div>
        <div>
          <span className="opacity-60 text-[10px] block">RMS POWER</span>
          <span className="font-bold tabular-nums">
            {telemetry.rmsDb <= -90 ? '-INF' : `${telemetry.rmsDb.toFixed(1)} dBFS`}
          </span>
        </div>
        <div>
          <span className="opacity-60 text-[10px] block">CREST FACTOR</span>
          <span className="font-bold tabular-nums">
            {telemetry.crestFactor > 0 ? telemetry.crestFactor : '---'}
          </span>
        </div>
        <div>
          <span className="opacity-60 text-[10px] block">EST. FUNDAMENTAL</span>
          <span className="font-bold tabular-nums">
            {telemetry.estFreq > 20 ? `${telemetry.estFreq} Hz` : '---'}
          </span>
        </div>
      </div>

      {/* Oscilloscope Plot */}
      {(activeView === 'all' || activeView === 'scope') && (
        <div className="border border-current/35 bg-black/60 p-3 shadow-inner">
          <div className="flex items-center justify-between border-b border-current/15 pb-1.5 mb-2 text-xs">
            <span className="font-bold">┌─ TIME-DOMAIN OSCILLOSCOPE (BRAILLE SUB-PIXEL SAMPLING)</span>
            <span className="opacity-50 text-[10px]">TRIGGER: ZERO-CROSSING · 1024 SAMPLES</span>
          </div>
          <div className="overflow-x-auto">
            <pre className="font-mono text-xs md:text-sm leading-[1.1] tracking-[0.05em] text-current/95 min-h-[140px] whitespace-pre select-text">
              {scopeLines.join('\n')}
            </pre>
          </div>
          <div className="flex items-center justify-between text-[10px] opacity-40 pt-1.5 border-t border-current/10">
            <span>-1.0 AMP</span>
            <span>0.0 V (CENTER)</span>
            <span>+1.0 AMP</span>
          </div>
        </div>
      )}

      {/* Split Row: Spectrum Analyzer & Lissajous Phase */}
      {(activeView === 'all' || activeView === 'spectrum' || activeView === 'phase') && (
        <div className={`grid gap-4 ${activeView === 'all' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* FFT Spectrum Analyzer */}
          {(activeView === 'all' || activeView === 'spectrum') && (
            <div className={`border border-current/35 bg-black/60 p-3 shadow-inner ${activeView === 'all' ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between border-b border-current/15 pb-1.5 mb-2 text-xs">
                <span className="font-bold">┌─ FFT FREQUENCY SPECTRUM ANALYZER</span>
                <span className="opacity-50 text-[10px]">512 BINS · PEAK HOLD (▔)</span>
              </div>
              <div className="overflow-x-auto">
                <pre className="font-mono text-xs md:text-sm leading-[1.15] tracking-[0.08em] text-current/95 min-h-[100px] whitespace-pre select-text">
                  {spectrumLines.join('\n')}
                </pre>
              </div>
              <div className="flex items-center justify-between text-[10px] opacity-40 pt-1.5 border-t border-current/10">
                <span>20Hz</span>
                <span>100Hz</span>
                <span>500Hz</span>
                <span>2kHz</span>
                <span>8kHz</span>
                <span>18kHz</span>
              </div>
            </div>
          )}

          {/* Stereo Phase Lissajous Scope */}
          {(activeView === 'all' || activeView === 'phase') && (
            <div className="border border-current/35 bg-black/60 p-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-current/15 pb-1.5 mb-2 text-xs">
                <span className="font-bold">┌─ STEREO PHASE / LISSAJOUS</span>
                <span className="opacity-50 text-[10px]">L vs R CORRELATION</span>
              </div>
              <div className="flex justify-center overflow-x-auto">
                <pre className="font-mono text-xs leading-[1.15] tracking-widest text-current/90 whitespace-pre">
                  {lissajousLines.join('\n')}
                </pre>
              </div>
              <div className="text-center text-[10px] opacity-40 pt-1.5 border-t border-current/10">
                <span>IN-PHASE (/) · MONO (|) · WIDE (O)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
