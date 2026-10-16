import React from 'react';
import { ColorTheme } from '../types/synth';
import { Volume2, VolumeX, Disc, Monitor, HelpCircle, Sparkles } from 'lucide-react';

interface TuiHeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  theme: ColorTheme;
  onThemeChange: (theme: ColorTheme) => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  onOpenHelp: () => void;
  onMutate: () => void;
  rms: number;
  peak: number;
}

export const TuiHeader: React.FC<TuiHeaderProps> = ({
  isPlaying,
  onTogglePlay,
  isRecording,
  onToggleRecord,
  theme,
  onThemeChange,
  crtEnabled,
  onToggleCrt,
  onOpenHelp,
  onMutate,
  rms,
  peak,
}) => {
  // ASCII master meter calculation
  const meterBlocks = 8;
  const activeBlocks = Math.min(meterBlocks, Math.round(peak * meterBlocks * 1.5));
  const meterBar = '█'.repeat(activeBlocks) + '░'.repeat(meterBlocks - activeBlocks);

  return (
    <header className="border-b border-current/20 pb-3 font-mono text-xs select-none">
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="text-base font-bold tracking-wider flex items-center gap-2">
            <span className="opacity-70">┌─[</span>
            <span className="tracking-widest uppercase">AURA-4 ANALOG SYNTH</span>
            <span className="opacity-70">]─</span>
          </div>
          <span className="opacity-50 hidden sm:inline">v1.0.0-TUI</span>
          <span className="opacity-40 hidden md:inline">·</span>
          <span className="opacity-70 hidden md:inline">4-OSC / FM-MATRIX / PARTICLE V2</span>
        </div>

        {/* Master Output Meter & Controls */}
        <div className="flex items-center gap-4">
          {/* Audio Engine Status */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1 font-bold border transition-colors flex items-center gap-2 cursor-pointer ${
              isPlaying
                ? 'bg-current text-black border-current shadow-sm'
                : 'border-current/40 hover:border-current opacity-80'
            }`}
            title="Press Space to toggle audio"
          >
            {isPlaying ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{isPlaying ? 'ENGINE ACTIVE' : 'ENGINE MUTED'}</span>
            <span className="text-[10px] opacity-75">[SPACE]</span>
          </button>

          {/* WAV Recorder */}
          <button
            onClick={onToggleRecord}
            className={`px-2.5 py-1 border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isRecording
                ? 'border-red-500 text-red-400 bg-red-950/40 animate-pulse'
                : 'border-current/40 hover:border-current opacity-80'
            }`}
            title="Record audio session to WAV/WebM"
          >
            <Disc size={13} className={isRecording ? 'text-red-400' : ''} />
            <span>{isRecording ? 'RECORDING...' : 'REC [R]'}</span>
          </button>

          {/* Quick Randomize / Mutate */}
          <button
            onClick={onMutate}
            className="px-2.5 py-1 border border-current/40 hover:border-current transition-colors flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100"
            title="Mutate sound parameters [M]"
          >
            <Sparkles size={12} />
            <span>MUTATE [M]</span>
          </button>

          {/* Help Manual */}
          <button
            onClick={onOpenHelp}
            className="px-2 py-1 border border-current/40 hover:border-current transition-colors flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100"
            title="Keyboard shortcuts & manual [?]"
          >
            <HelpCircle size={13} />
            <span className="hidden sm:inline">HELP [?]</span>
          </button>
        </div>
      </div>

      {/* Secondary Telemetry & Phosphor Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] opacity-80 pt-1 border-t border-current/10">
        <div className="flex items-center gap-3">
          <span>PEAK: <span className="font-bold">{meterBar}</span></span>
          <span>RMS: <span className="font-bold">{(rms * 100).toFixed(0)}%</span></span>
          <span className="opacity-40">|</span>
          <span className="hidden sm:inline">SR: 44.1kHz</span>
          <span className="hidden sm:inline">LATENCY: 5.3ms</span>
        </div>

        <div className="flex items-center gap-4">
          {/* CRT Scanlines Toggle */}
          <button
            onClick={onToggleCrt}
            className={`flex items-center gap-1.5 cursor-pointer hover:underline ${
              crtEnabled ? 'opacity-100 font-semibold' : 'opacity-40'
            }`}
            title="Toggle CRT scanlines and phosphor glow [V]"
          >
            <Monitor size={12} />
            <span>CRT SCANLINES: {crtEnabled ? '[ON]' : '[OFF]'}</span>
          </button>

          {/* Phosphor Theme Picker */}
          <div className="flex items-center gap-1.5">
            <span className="opacity-60">PHOSPHOR:</span>
            {(['amber', 'green', 'cyan', 'matrix', 'slate'] as ColorTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                className={`px-1.5 py-0.5 border text-[10px] uppercase cursor-pointer transition-colors ${
                  theme === t
                    ? 'border-current font-bold bg-current/15'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
