// SPDX-License-Identifier: GPL-3.0-or-later
import React, { useRef, useState, useEffect } from 'react';
import { SampleConfig } from '../types/synth';
import { audioEngine } from '../audio/AudioEngine';
import { renderAsciiSlider } from '../utils/tuiPlots';
import { Upload, Play, Pause, Square, Repeat, Rewind, Music, Volume2, Sparkles, Sliders } from 'lucide-react';

interface SamplePaneProps {
  config: SampleConfig;
  onChange: (config: SampleConfig) => void;
  onAudioStartNeeded: () => Promise<void>;
}

export const SamplePane: React.FC<SamplePaneProps> = ({
  config,
  onChange,
  onAudioStartNeeded,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [playheadFraction, setPlayheadFraction] = useState<number>(0);
  const [waveformSamples, setWaveformSamples] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Update playhead position in real time when sample is playing
  useEffect(() => {
    let animId: number;
    const updatePlayhead = () => {
      if (config.isPlaying) {
        setPlayheadFraction(audioEngine.getSamplePlayhead());
      }
      animId = requestAnimationFrame(updatePlayhead);
    };
    animId = requestAnimationFrame(updatePlayhead);
    return () => cancelAnimationFrame(animId);
  }, [config.isPlaying]);

  // Load waveform data when sample changes
  useEffect(() => {
    if (config.loaded) {
      const peaks = audioEngine.getSampleWaveform(72);
      setWaveformSamples(peaks);
    } else {
      setWaveformSamples(null);
    }
  }, [config.loaded, config.fileName]);

  const update = (updates: Partial<SampleConfig>) => {
    const updated = { ...config, ...updates };
    onChange(updated);
    audioEngine.updateSampleConfig(updates);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAudioFile(file);
  };

  const processAudioFile = async (file: File) => {
    try {
      setIsLoading(true);
      setStatusMessage(`DECODING ${file.name.toUpperCase()}...`);
      await onAudioStartNeeded();
      const loadedConfig = await audioEngine.loadSampleFile(file);
      onChange(loadedConfig);
      setStatusMessage(`LOADED: ${file.name} (${loadedConfig.duration.toFixed(1)}s)`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      setStatusMessage(`ERROR DECODING FILE: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.includes('audio') || file.name.match(/\.(wav|mp3|ogg|flac|aiff|m4a)$/i))) {
      await processAudioFile(file);
    } else {
      setStatusMessage('UNSUPPORTED FORMAT: PLEASE DROP A .WAV, .MP3, OR .OGG FILE');
    }
  };

  const handleLoadBuiltin = async (type: 'sub_hydro' | 'space_drone' | 'mellotron') => {
    try {
      setIsLoading(true);
      setStatusMessage('GENERATING TAPE LOOP...');
      await onAudioStartNeeded();
      const loaded = await audioEngine.generateBuiltinAmbientSample(type);
      onChange(loaded);
      setStatusMessage(`LOADED TAPE: ${loaded.fileName}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      setStatusMessage(`ERROR: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayToggle = async () => {
    await onAudioStartNeeded();
    if (config.isPlaying) {
      audioEngine.pauseSample();
      onChange({ ...config, isPlaying: false });
    } else {
      audioEngine.playSample(playheadFraction);
      onChange({ ...config, isPlaying: true });
    }
  };

  const handleStop = () => {
    audioEngine.stopSample();
    setPlayheadFraction(0);
    onChange({ ...config, isPlaying: false });
  };

  // Convert waveform peaks into Braille or block character line with playhead
  const renderWaveformVisual = () => {
    if (!waveformSamples) {
      return '── NO SAMPLE LOADED ── DROP A .WAV OR .MP3 FILE OR SELECT A TAPE PRESET';
    }

    const cols = waveformSamples.length;
    const playheadCol = Math.floor(playheadFraction * cols);
    const loopStartCol = Math.floor(config.loopStart * cols);
    const loopEndCol = Math.floor(config.loopEnd * cols);

    const blocks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    let waveStr = '';
    let markerStr = '';

    for (let i = 0; i < cols; i++) {
      const peak = waveformSamples[i] || 0;
      const bIdx = Math.min(7, Math.max(0, Math.floor(peak * 8)));

      if (i === playheadCol) {
        waveStr += '▼';
      } else {
        waveStr += blocks[bIdx];
      }

      if (i === loopStartCol) {
        markerStr += '├';
      } else if (i === loopEndCol) {
        markerStr += '┤';
      } else if (i > loopStartCol && i < loopEndCol) {
        markerStr += '─';
      } else {
        markerStr += ' ';
      }
    }

    return `${waveStr}\n${markerStr}`;
  };

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-2 text-xs">
        <div>
          <span className="font-bold">EXTERNAL TAPE &amp; SAMPLE LOOPER</span>
          <span className="opacity-50 ml-2 hidden sm:inline">
            LOAD .WAV / .MP3 / .OGG · SEPARATE AUDIO CHANNEL WITH FULL EFFECTS ROUTING
          </span>
        </div>
        {statusMessage && (
          <div className="text-[11px] font-bold text-yellow-300 animate-pulse">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Drag & Drop / File Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-current bg-current/15'
            : 'border-current/30 hover:border-current/70 bg-black/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
          <Upload size={20} className="opacity-70 mb-1" />
          <div className="text-xs font-bold">
            DROP .WAV / .MP3 / .OGG AUDIO FILE HERE OR CLICK TO BROWSE
          </div>
          <div className="text-[10px] opacity-60">
            Accepts standard uncompressed PCM WAV, MP3, Vorbis, and FLAC audio files
          </div>
        </div>
      </div>

      {/* Built-in Ambient Tape Presets */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 border border-current/25 bg-current/5 text-xs">
        <span className="opacity-60 text-[11px] flex items-center gap-1">
          <Sparkles size={12} />
          <span>QUICK LOAD TAPE PRESETS:</span>
        </span>
        <button
          onClick={() => handleLoadBuiltin('sub_hydro')}
          className="px-2.5 py-1 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
        >
          SUB-HYDROPHONE TAPE (48Hz)
        </button>
        <button
          onClick={() => handleLoadBuiltin('space_drone')}
          className="px-2.5 py-1 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
        >
          RADIO TELESCOPE HARMONICS
        </button>
        <button
          onClick={() => handleLoadBuiltin('mellotron')}
          className="px-2.5 py-1 border border-current/30 hover:border-current hover:bg-current/10 text-[11px] cursor-pointer"
        >
          VINTAGE MELLOTRON CHORDS
        </button>
      </div>

      {/* Sample Metadata & Waveform Display */}
      {config.loaded && (
        <div className="border border-current/30 bg-black/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/20 pb-2 text-xs">
            <div className="flex items-center gap-2">
              <Music size={14} />
              <span className="font-bold">{config.fileName}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] opacity-75">
              <span>LENGTH: <strong className="font-bold">{config.duration.toFixed(2)}s</strong></span>
              <span>SR: <strong className="font-bold">{config.sampleRate} Hz</strong></span>
              <span>CHANNELS: <strong className="font-bold">{config.channels === 1 ? 'MONO' : 'STEREO'}</strong></span>
              <span>SIZE: <strong className="font-bold">{(config.fileSize / 1024).toFixed(0)} KB</strong></span>
            </div>
          </div>

          {/* Character Waveform with Playhead */}
          <div className="p-3 border border-current/20 bg-black/80">
            <div className="flex items-center justify-between text-[10px] opacity-50 mb-1">
              <span>0.0s (LOOP START: {(config.loopStart * config.duration).toFixed(1)}s)</span>
              <span>PLAYHEAD: {(playheadFraction * config.duration).toFixed(1)}s / {config.duration.toFixed(1)}s</span>
              <span>{config.duration.toFixed(1)}s (LOOP END: {(config.loopEnd * config.duration).toFixed(1)}s)</span>
            </div>
            <pre className="font-mono text-xs leading-[1.2] text-current/90 overflow-x-auto whitespace-pre">
              {renderWaveformVisual()}
            </pre>
            <div className="text-[10px] opacity-40 text-center mt-1">
              [├────── LOOP RANGE ──────┤] · ▼ PLAYHEAD
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayToggle}
                className={`px-3 py-1.5 border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  config.isPlaying
                    ? 'bg-current text-black border-current shadow-sm'
                    : 'border-current/40 hover:border-current opacity-85 hover:opacity-100'
                }`}
              >
                {config.isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                <span>{config.isPlaying ? 'PAUSE' : 'PLAY SAMPLE'}</span>
              </button>

              <button
                onClick={handleStop}
                className="px-2.5 py-1.5 border border-current/30 hover:border-current text-xs flex items-center gap-1 cursor-pointer opacity-70 hover:opacity-100"
              >
                <Square size={12} fill="currentColor" />
                <span>STOP</span>
              </button>

              <button
                onClick={() => update({ loop: !config.loop })}
                className={`px-2.5 py-1.5 border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                  config.loop
                    ? 'border-current bg-current/15 font-bold'
                    : 'border-current/25 opacity-50 hover:opacity-80'
                }`}
              >
                <Repeat size={12} />
                <span>LOOP: {config.loop ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => {
                  const rev = !config.reverse;
                  update({ reverse: rev });
                  if (config.isPlaying) {
                    audioEngine.playSample(playheadFraction);
                  }
                }}
                className={`px-2.5 py-1.5 border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                  config.reverse
                    ? 'border-yellow-400 text-yellow-300 bg-yellow-950/40 font-bold'
                    : 'border-current/25 opacity-50 hover:opacity-80'
                }`}
              >
                <Rewind size={12} />
                <span>REVERSE TAPE: {config.reverse ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-60">SCRUB:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={playheadFraction}
                onChange={(e) => {
                  const frac = parseFloat(e.target.value);
                  setPlayheadFraction(frac);
                  if (config.isPlaying) {
                    audioEngine.playSample(frac);
                  }
                }}
                className="w-32 accent-current cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sample Parameters & Effects Routing Rack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Playback & Loop Tuning */}
        <div className="p-4 border border-current/30 bg-black/40 space-y-3">
          <div className="border-b border-current/20 pb-2 text-xs font-bold flex items-center gap-2">
            <Sliders size={13} />
            <span>PITCH, SPEED &amp; LOOP BOUNDARIES</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Pitch Semitones */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">PITCH OFFSET:</span>
                <span className="font-bold tabular-nums">
                  {config.pitchSemitones > 0 ? `+${config.pitchSemitones}` : config.pitchSemitones} semitones
                </span>
              </div>
              <input
                type="range"
                min="-24"
                max="24"
                step="1"
                value={config.pitchSemitones}
                onChange={(e) => update({ pitchSemitones: parseInt(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] opacity-60">
                <button onClick={() => update({ pitchSemitones: -12 })} className="hover:underline cursor-pointer">-1 Oct</button>
                <button onClick={() => update({ pitchSemitones: -7 })} className="hover:underline cursor-pointer">-5th</button>
                <button onClick={() => update({ pitchSemitones: 0 })} className="hover:underline cursor-pointer">Unison</button>
                <button onClick={() => update({ pitchSemitones: 7 })} className="hover:underline cursor-pointer">+5th</button>
                <button onClick={() => update({ pitchSemitones: 12 })} className="hover:underline cursor-pointer">+1 Oct</button>
              </div>
            </div>

            {/* Playback Speed / Tape Varispeed */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">VARISPEED / PLAYBACK RATE:</span>
                <span className="font-bold tabular-nums">{config.playbackRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.05"
                value={config.playbackRate}
                onChange={(e) => update({ playbackRate: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
              <div className="text-[10px] opacity-50 font-mono">
                {renderAsciiSlider(config.playbackRate, 0.25, 3.0, 16, 'thumb')}
              </div>
            </div>

            {/* Loop Start & Loop End Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-current/10">
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">LOOP START:</span>
                  <span className="font-bold tabular-nums">{(config.loopStart * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.95"
                  step="0.01"
                  value={config.loopStart}
                  onChange={(e) => {
                    const start = parseFloat(e.target.value);
                    update({ loopStart: start, loopEnd: Math.max(start + 0.05, config.loopEnd) });
                  }}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="opacity-70">LOOP END:</span>
                  <span className="font-bold tabular-nums">{(config.loopEnd * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.01"
                  value={config.loopEnd}
                  onChange={(e) => {
                    const end = parseFloat(e.target.value);
                    update({ loopEnd: end, loopStart: Math.min(end - 0.05, config.loopStart) });
                  }}
                  className="w-full accent-current cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mix & Full Effects Routing */}
        <div className="p-4 border border-current/30 bg-black/40 space-y-3">
          <div className="border-b border-current/20 pb-2 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Volume2 size={13} />
              <span>MIX LEVEL &amp; EFFECTS BUS ROUTING</span>
            </span>

            {/* Send to Effects Toggle */}
            <button
              onClick={() => update({ sendToEffects: !config.sendToEffects })}
              className={`px-2 py-0.5 border text-[11px] font-bold cursor-pointer transition-colors ${
                config.sendToEffects
                  ? 'bg-current text-black border-current shadow-sm'
                  : 'border-current/30 opacity-50 hover:opacity-80'
              }`}
            >
              {config.sendToEffects ? 'EFFECTS RACK: ENABLED' : 'DIRECT CLEAN: MASTER'}
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Sample Gain */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">SAMPLE VOLUME / GAIN:</span>
                <span className="font-bold tabular-nums">{(config.gain * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={config.gain}
                onChange={(e) => update({ gain: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
              <div className="text-[10px] opacity-50 font-mono">
                {renderAsciiSlider(config.gain, 0, 1.5, 16, 'fill')}
              </div>
            </div>

            {/* Stereo Pan */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">STEREO PAN:</span>
                <span className="font-bold tabular-nums">
                  {config.pan === 0 ? 'CENTER' : config.pan < 0 ? `L ${Math.abs(Math.round(config.pan * 100))}%` : `R ${Math.round(config.pan * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={config.pan}
                onChange={(e) => update({ pan: parseFloat(e.target.value) })}
                className="w-full accent-current cursor-pointer"
              />
              <div className="text-[10px] opacity-50 font-mono">
                {renderAsciiSlider(config.pan, -1, 1, 16, 'thumb')}
              </div>
            </div>

            {/* Effects Send Amount */}
            <div className="pt-2 border-t border-current/10">
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="opacity-70">EFFECTS SEND LEVEL:</span>
                <span className="font-bold tabular-nums">
                  {config.sendToEffects ? `${(config.effectsSendLevel * 100).toFixed(0)}%` : 'MUTED (CLEAN DRY)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                disabled={!config.sendToEffects}
                value={config.effectsSendLevel}
                onChange={(e) => update({ effectsSendLevel: parseFloat(e.target.value) })}
                className={`w-full accent-current ${config.sendToEffects ? 'cursor-pointer' : 'opacity-30'}`}
              />
              <div className="text-[10px] opacity-60 mt-1">
                Feeds into State-Variable Filter → Chorus → Red Panda Particle V2 Granular Delay → Tape Delay → Reverb → Saturation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
