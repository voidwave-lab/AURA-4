import React, { useState, useEffect } from 'react';
import { SequencerConfig, TrackConfig, StepConfig, StepParamType, ClockDivision, SequencerDirection } from '../types/synth';
import { audioEngine } from '../audio/AudioEngine';
import {
  NOTE_NAMES,
  SEQUENCER_SCALES,
  SEQUENCER_PRESETS,
  midiToNoteName,
  midiToFreq,
  noteNameToMidi,
} from '../data/sequencerData';
import { Play, Square, Sparkles, Trash2, Sliders, Music, Shuffle, ChevronRight, Activity } from 'lucide-react';

interface SequencerPaneProps {
  config: SequencerConfig;
  onChange: (config: SequencerConfig) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const SequencerPane: React.FC<SequencerPaneProps> = ({
  config,
  onChange,
  isPlaying,
  onTogglePlay,
}) => {
  // Live playhead step for each track [track0, track1, track2, track3]
  const [liveSteps, setLiveSteps] = useState<number[]>([0, 0, 0, 0]);

  // Selected step for detailed parameter lock & note editing: [trackIndex, stepIndex] | null
  const [selectedStepCoord, setSelectedStepCoord] = useState<{ track: number; step: number } | null>({
    track: 0,
    step: 0,
  });

  // Listen to AudioEngine's clock for real-time playhead tracking
  useEffect(() => {
    const unsubscribe = audioEngine.onSequencerStep((stepIndices) => {
      setLiveSteps([...stepIndices]);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Update track
  const updateTrack = (trackIndex: number, updater: (t: TrackConfig) => TrackConfig) => {
    const newTracks = config.tracks.map((t, idx) => (idx === trackIndex ? updater(t) : t));
    onChange({ ...config, tracks: newTracks });
  };

  // Toggle step active or select step
  const handleStepClick = (trackIndex: number, stepIndex: number, e: React.MouseEvent) => {
    // If Shift is pressed or if already selected, toggle active
    const track = config.tracks[trackIndex];
    const currentStep = track.steps[stepIndex];

    if (e.shiftKey) {
      // Toggle active without changing selection
      updateTrack(trackIndex, (t) => {
        const newSteps = [...t.steps];
        newSteps[stepIndex] = { ...currentStep, active: !currentStep.active };
        return { ...t, steps: newSteps };
      });
      return;
    }

    if (selectedStepCoord?.track === trackIndex && selectedStepCoord?.step === stepIndex) {
      // Clicked currently selected step: toggle active
      updateTrack(trackIndex, (t) => {
        const newSteps = [...t.steps];
        newSteps[stepIndex] = { ...currentStep, active: !currentStep.active };
        return { ...t, steps: newSteps };
      });
    } else {
      // Select step for inspection
      setSelectedStepCoord({ track: trackIndex, step: stepIndex });
      if (!currentStep.active) {
        // Automatically activate if selecting an inactive step
        updateTrack(trackIndex, (t) => {
          const newSteps = [...t.steps];
          newSteps[stepIndex] = { ...currentStep, active: true };
          return { ...t, steps: newSteps };
        });
      }
    }
  };

  // Update selected step properties
  const updateSelectedStep = (updater: (s: StepConfig) => StepConfig) => {
    if (!selectedStepCoord) return;
    const { track: tIdx, step: sIdx } = selectedStepCoord;
    updateTrack(tIdx, (t) => {
      const newSteps = [...t.steps];
      newSteps[sIdx] = updater(newSteps[sIdx]);
      return { ...t, steps: newSteps };
    });
  };

  // Scale quantizer: quantizes active steps to a chosen scale
  const applyScaleQuantizer = (scaleIndex: number) => {
    const scale = SEQUENCER_SCALES[scaleIndex];
    if (!scale) return;

    const baseRoots = [36, 48, 60, 72]; // Root per track (C2, C3, C4, C5)

    const newTracks = config.tracks.map((track, tIdx) => {
      const root = baseRoots[tIdx];
      const newSteps = track.steps.map((step, sIdx) => {
        if (!step.active) return step;
        const degree = sIdx % scale.intervals.length;
        const octaveShift = Math.floor(sIdx / scale.intervals.length) * 12;
        const newMidi = root + scale.intervals[degree] + octaveShift;
        return {
          ...step,
          midi: newMidi,
          note: midiToNoteName(newMidi),
          freq: midiToFreq(newMidi),
        };
      });
      return { ...track, steps: newSteps };
    });

    onChange({ ...config, tracks: newTracks });
  };

  // Mutate / Randomize pattern
  const mutatePattern = () => {
    const newTracks = config.tracks.map((track, tIdx) => {
      const baseMidi = [36, 48, 60, 72][tIdx];
      const pentatonic = [0, 3, 5, 7, 10, 12, 15];

      const newSteps = track.steps.map((st, i) => {
        // Density probability
        const active = tIdx === 0 ? i % 4 === 0 || i % 8 === 2 : Math.random() < 0.6;
        const noteOffset = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        const midi = baseMidi + noteOffset;
        const hasParam = Math.random() < 0.25;
        const paramTypes: StepParamType[] = ['none', 'fm_depth', 'filter_cutoff', 'pan'];
        const pType = hasParam ? paramTypes[Math.floor(Math.random() * paramTypes.length)] : 'none';
        let pVal = 0;
        if (pType === 'fm_depth') pVal = Math.floor(Math.random() * 250);
        if (pType === 'filter_cutoff') pVal = Math.floor(Math.random() * 6000 + 400);
        if (pType === 'pan') pVal = parseFloat(((Math.random() * 2 - 1) * 0.8).toFixed(2));

        return {
          ...st,
          active,
          midi,
          note: midiToNoteName(midi),
          freq: midiToFreq(midi),
          velocity: parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)),
          gate: parseFloat((Math.random() * 0.5 + 0.4).toFixed(2)),
          slide: Math.random() < 0.2,
          paramType: pType,
          paramValue: pVal,
        };
      });
      return { ...track, steps: newSteps };
    });

    onChange({ ...config, tracks: newTracks });
  };

  // Clear all steps
  const clearAllSteps = () => {
    const newTracks = config.tracks.map((track) => ({
      ...track,
      steps: track.steps.map((s) => ({ ...s, active: false })),
    }));
    onChange({ ...config, tracks: newTracks });
  };

  // Active step currently selected
  const activeSelectedStep = selectedStepCoord
    ? config.tracks[selectedStepCoord.track]?.steps[selectedStepCoord.step]
    : null;

  const activeSelectedTrack = selectedStepCoord ? config.tracks[selectedStepCoord.track] : null;

  return (
    <div className="space-y-4 font-mono select-none">
      {/* 1. Header Toolbar: Master Transport, BPM, Division, Swing, Mode */}
      <div className="border border-current/30 p-3 bg-current/5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Transport & Engine Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isPlaying) onTogglePlay();
                onChange({ ...config, enabled: !config.enabled });
              }}
              className={`px-3 py-1.5 border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                config.enabled && isPlaying
                  ? 'bg-current text-black border-current shadow-sm'
                  : 'border-current/40 hover:border-current hover:bg-current/10'
              }`}
            >
              {config.enabled && isPlaying ? (
                <>
                  <Square size={13} fill="currentColor" />
                  <span>[■ STOP CLOCK]</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>[► RUN CLOCK]</span>
                </>
              )}
            </button>

            {/* Sync Status Badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 border border-current/20 text-[11px]">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  config.enabled && isPlaying ? 'bg-current animate-pulse' : 'bg-current/20'
                }`}
              />
              <span className="opacity-80">
                {config.enabled && isPlaying ? 'LOCKED (AUDIO-RATE)' : 'SYNC STANDBY'}
              </span>
            </div>

            {/* Mode: Gated vs Drone */}
            <div className="flex items-center border border-current/30 text-[11px] overflow-hidden">
              <button
                onClick={() => onChange({ ...config, mode: 'gated' })}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  config.mode === 'gated' ? 'bg-current text-black font-bold' : 'hover:bg-current/10 opacity-70'
                }`}
                title="Gated mode triggers ADSR amplitude envelopes on each step"
              >
                GATED SYNTH
              </button>
              <button
                onClick={() => onChange({ ...config, mode: 'drone' })}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  config.mode === 'drone' ? 'bg-current text-black font-bold' : 'hover:bg-current/10 opacity-70'
                }`}
                title="Drone mode retains continuous analog drone while automating pitch & parameter changes"
              >
                DRONE AUTOMATION
              </button>
            </div>
          </div>

          {/* BPM & Division & Swing */}
          <div className="flex flex-wrap items-center gap-3">
            {/* BPM */}
            <div className="flex items-center gap-1.5 border border-current/20 px-2 py-1">
              <span className="opacity-60 text-[10px]">TEMPO</span>
              <button
                onClick={() => onChange({ ...config, bpm: Math.max(30, config.bpm - 2) })}
                className="px-1 border border-current/20 hover:border-current hover:bg-current/10 cursor-pointer"
              >
                -
              </button>
              <span className="font-bold w-12 text-center">{config.bpm} BPM</span>
              <button
                onClick={() => onChange({ ...config, bpm: Math.min(240, config.bpm + 2) })}
                className="px-1 border border-current/20 hover:border-current hover:bg-current/10 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Division */}
            <div className="flex items-center border border-current/20 text-[11px]">
              {(['1/4', '1/8', '1/16', '1/32'] as ClockDivision[]).map((div) => (
                <button
                  key={div}
                  onClick={() => onChange({ ...config, division: div })}
                  className={`px-2 py-1 transition-colors cursor-pointer border-r last:border-r-0 border-current/20 ${
                    config.division === div ? 'bg-current text-black font-bold' : 'hover:bg-current/10 opacity-70'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>

            {/* Swing */}
            <div className="flex items-center gap-1.5 border border-current/20 px-2 py-1 text-[11px]">
              <span className="opacity-60 text-[10px]">SWING</span>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.05"
                value={config.swing}
                onChange={(e) => onChange({ ...config, swing: parseFloat(e.target.value) })}
                className="w-16 accent-current cursor-pointer"
              />
              <span className="font-bold w-8 text-right">{Math.round(config.swing * 100)}%</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={mutatePattern}
              className="px-2 py-1 border border-current/30 hover:border-current hover:bg-current/10 flex items-center gap-1 text-[11px] cursor-pointer"
              title="Randomize pitches and rhythmic gates"
            >
              <Shuffle size={11} />
              <span>MUTATE [M]</span>
            </button>
            <button
              onClick={clearAllSteps}
              className="px-2 py-1 border border-current/30 hover:border-current hover:bg-current/10 flex items-center gap-1 text-[11px] cursor-pointer opacity-70 hover:opacity-100"
              title="Clear all steps in the sequence"
            >
              <Trash2 size={11} />
              <span>CLEAR</span>
            </button>
          </div>
        </div>

        {/* Preset & Scale Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-current/15 text-[11px]">
          {/* Built-in Sequencer Presets */}
          <div className="flex items-center gap-1.5">
            <span className="opacity-60 text-[10px]">PRESETS:</span>
            {SEQUENCER_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => onChange(p.config)}
                className="px-2 py-0.5 border border-current/20 hover:border-current hover:bg-current/10 cursor-pointer transition-colors"
                title={p.description}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Scale Quantizer */}
          <div className="flex items-center gap-1.5">
            <span className="opacity-60 text-[10px] flex items-center gap-1">
              <Music size={10} />
              <span>QUANTIZE:</span>
            </span>
            <select
              onChange={(e) => {
                if (e.target.value !== '') {
                  applyScaleQuantizer(parseInt(e.target.value, 10));
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="bg-black border border-current/30 text-current text-[11px] px-2 py-0.5 cursor-pointer outline-none"
            >
              <option value="" disabled>
                Select Scale...
              </option>
              {SEQUENCER_SCALES.map((s, idx) => (
                <option key={s.name} value={idx}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Step Sequencer Grid (4 Tracks) */}
      <div className="border border-current/30 p-3 space-y-4 bg-black/40">
        {config.tracks.map((track, trackIdx) => {
          const liveStep = liveSteps[trackIdx] % track.length;

          return (
            <div key={track.id} className="border border-current/20 p-2.5 space-y-2 bg-current/2">
              {/* Track Info Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-current/15 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12px]">{track.name}</span>

                  {/* Mute & Solo */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateTrack(trackIdx, (t) => ({ ...t, enabled: !t.enabled }))}
                      className={`px-1.5 py-0.5 border text-[10px] cursor-pointer transition-colors ${
                        track.enabled
                          ? 'border-current/40 hover:border-current'
                          : 'bg-red-950/60 border-red-500/80 text-red-300'
                      }`}
                    >
                      {track.enabled ? 'MUTE' : 'MUTED'}
                    </button>
                    <button
                      onClick={() => updateTrack(trackIdx, (t) => ({ ...t, solo: !t.solo }))}
                      className={`px-1.5 py-0.5 border text-[10px] cursor-pointer transition-colors ${
                        track.solo
                          ? 'bg-current text-black font-bold border-current'
                          : 'border-current/30 hover:border-current'
                      }`}
                    >
                      SOLO
                    </button>
                  </div>
                </div>

                {/* Track Transposition, Polymeter Length, Direction */}
                <div className="flex items-center gap-3 text-[11px]">
                  {/* Octave Shift */}
                  <div className="flex items-center gap-1">
                    <span className="opacity-50 text-[10px]">OCT:</span>
                    <button
                      onClick={() =>
                        updateTrack(trackIdx, (t) => ({ ...t, octaveOffset: Math.max(-2, t.octaveOffset - 1) }))
                      }
                      className="px-1 border border-current/20 hover:border-current cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold w-4 text-center">
                      {track.octaveOffset >= 0 ? `+${track.octaveOffset}` : track.octaveOffset}
                    </span>
                    <button
                      onClick={() =>
                        updateTrack(trackIdx, (t) => ({ ...t, octaveOffset: Math.min(2, t.octaveOffset + 1) }))
                      }
                      className="px-1 border border-current/20 hover:border-current cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Polymetric Length */}
                  <div className="flex items-center gap-1">
                    <span className="opacity-50 text-[10px]">LEN:</span>
                    <select
                      value={track.length}
                      onChange={(e) =>
                        updateTrack(trackIdx, (t) => ({ ...t, length: parseInt(e.target.value, 10) }))
                      }
                      className="bg-black border border-current/30 text-current text-[11px] px-1 py-0.5 cursor-pointer outline-none"
                    >
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((len) => (
                        <option key={len} value={len}>
                          {len} {len === 16 ? '(Full)' : 'steps'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direction */}
                  <div className="flex items-center gap-1">
                    <span className="opacity-50 text-[10px]">DIR:</span>
                    {(['forward', 'backward', 'pingpong', 'random'] as SequencerDirection[]).map((dir) => {
                      const icons: Record<SequencerDirection, string> = {
                        forward: '→',
                        backward: '←',
                        pingpong: '⇄',
                        random: '⚄',
                      };
                      return (
                        <button
                          key={dir}
                          onClick={() => updateTrack(trackIdx, (t) => ({ ...t, direction: dir }))}
                          className={`px-1.5 py-0.5 border text-[10px] cursor-pointer ${
                            track.direction === dir
                              ? 'bg-current text-black font-bold border-current'
                              : 'border-current/20 opacity-60 hover:opacity-100'
                          }`}
                          title={`Direction: ${dir}`}
                        >
                          {icons[dir]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Fill Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateTrack(trackIdx, (t) => ({
                          ...t,
                          steps: t.steps.map((s, i) => ({ ...s, active: i % 4 === 0 })),
                        }))
                      }
                      className="px-1 py-0.5 border border-current/20 hover:border-current text-[10px] cursor-pointer opacity-70 hover:opacity-100"
                      title="Quarter notes fill (1, 5, 9, 13)"
                    >
                      /4
                    </button>
                    <button
                      onClick={() =>
                        updateTrack(trackIdx, (t) => ({
                          ...t,
                          steps: t.steps.map((s, i) => ({ ...s, active: i % 2 === 0 })),
                        }))
                      }
                      className="px-1 py-0.5 border border-current/20 hover:border-current text-[10px] cursor-pointer opacity-70 hover:opacity-100"
                      title="Eighth notes fill"
                    >
                      /2
                    </button>
                    <button
                      onClick={() =>
                        updateTrack(trackIdx, (t) => ({
                          ...t,
                          steps: t.steps.map((s) => ({ ...s, active: true })),
                        }))
                      }
                      className="px-1 py-0.5 border border-current/20 hover:border-current text-[10px] cursor-pointer opacity-70 hover:opacity-100"
                      title="Fill all 16 steps"
                    >
                      ALL
                    </button>
                  </div>
                </div>
              </div>

              {/* Step Sequence Timeline Grid */}
              <div className="grid grid-cols-16 gap-1 pt-1">
                {track.steps.slice(0, 16).map((step, stepIdx) => {
                  const isPastLength = stepIdx >= track.length;
                  const isCurrentLive = liveStep === stepIdx && config.enabled && isPlaying && !isPastLength;
                  const isSelected =
                    selectedStepCoord?.track === trackIdx && selectedStepCoord?.step === stepIdx;

                  // Group boundary (4-step bars)
                  const isBarStart = stepIdx % 4 === 0;

                  return (
                    <div
                      key={stepIdx}
                      className={`relative flex flex-col items-center justify-between border transition-all text-center select-none cursor-pointer p-1 min-h-[58px] ${
                        isPastLength
                          ? 'opacity-20 border-current/10 bg-transparent'
                          : isSelected
                          ? 'border-current shadow-sm ring-1 ring-current'
                          : isBarStart
                          ? 'border-current/40 hover:border-current'
                          : 'border-current/20 hover:border-current/60'
                      } ${
                        isCurrentLive
                          ? 'bg-current/25 font-bold'
                          : step.active
                          ? 'bg-current/10'
                          : 'bg-black/50'
                      }`}
                      onClick={(e) => handleStepClick(trackIdx, stepIdx, e)}
                    >
                      {/* Live Playhead Indicator Banner */}
                      {isCurrentLive && (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] text-current leading-none font-bold">
                          ▼
                        </div>
                      )}

                      {/* Step Number */}
                      <div className="flex items-center justify-between w-full text-[9px] opacity-50 px-0.5">
                        <span>{String(stepIdx + 1).padStart(2, '0')}</span>
                        {step.slide && <span className="text-[8px] font-bold">~</span>}
                      </div>

                      {/* Trigger / Note Display */}
                      <div className="my-auto py-0.5 w-full">
                        {step.active ? (
                          <div
                            className={`font-bold text-[11px] leading-tight ${
                              isCurrentLive ? 'text-current underline scale-105' : 'text-current'
                            }`}
                          >
                            {step.note}
                          </div>
                        ) : (
                          <div className="text-[10px] opacity-25">··</div>
                        )}
                      </div>

                      {/* Velocity Gauge or Parameter Lock Indicator */}
                      <div className="w-full flex items-center justify-center gap-0.5 pt-0.5 border-t border-current/10 text-[8px]">
                        {step.paramType !== 'none' ? (
                          <span
                            className="text-[8px] px-1 py-0.2 bg-current text-black font-bold uppercase rounded-xs"
                            title={`Param Lock: ${step.paramType} = ${step.paramValue}`}
                          >
                            {step.paramType === 'fm_depth'
                              ? 'FM'
                              : step.paramType === 'filter_cutoff'
                              ? 'FLT'
                              : step.paramType === 'pan'
                              ? 'PAN'
                              : 'PTC'}
                          </span>
                        ) : step.active ? (
                          <div
                            className="h-1 bg-current opacity-80"
                            style={{ width: `${Math.round(step.velocity * 100)}%` }}
                            title={`Velocity: ${Math.round(step.velocity * 100)}%`}
                          />
                        ) : (
                          <span className="opacity-0">·</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Detailed Step Inspector & Parameter Lock Editor */}
      {activeSelectedStep && activeSelectedTrack && selectedStepCoord && (
        <div className="border border-current/40 p-3 bg-current/5 space-y-3">
          <div className="flex items-center justify-between border-b border-current/20 pb-1.5 text-xs font-bold">
            <div className="flex items-center gap-2">
              <Sliders size={13} />
              <span>
                STEP INSPECTOR: {activeSelectedTrack.name} ── STEP [
                {String(selectedStepCoord.step + 1).padStart(2, '0')}]
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  updateSelectedStep((s) => ({
                    ...s,
                    active: !s.active,
                  }))
                }
                className={`px-2 py-0.5 border text-[11px] cursor-pointer ${
                  activeSelectedStep.active
                    ? 'bg-current text-black font-bold border-current'
                    : 'border-current/40 hover:border-current'
                }`}
              >
                {activeSelectedStep.active ? '[ACTIVE TRIGGER]' : '[REST / MUTED]'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Column 1: Pitch & Note Tuning */}
            <div className="space-y-2 border border-current/20 p-2.5 bg-black/40">
              <div className="text-[10px] opacity-60 font-bold uppercase">01. Note &amp; Pitch</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{activeSelectedStep.note}</span>
                <span className="text-[11px] opacity-70">
                  {activeSelectedStep.freq.toFixed(1)} Hz (MIDI {activeSelectedStep.midi})
                </span>
              </div>

              {/* Semitone & Octave Adjust */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => {
                    const newM = Math.max(12, activeSelectedStep.midi - 12);
                    updateSelectedStep((s) => ({
                      ...s,
                      midi: newM,
                      note: midiToNoteName(newM),
                      freq: midiToFreq(newM),
                    }));
                  }}
                  className="px-1.5 py-0.5 border border-current/20 hover:border-current cursor-pointer"
                  title="Octave Down"
                >
                  -1 Oct
                </button>
                <button
                  onClick={() => {
                    const newM = Math.max(12, activeSelectedStep.midi - 1);
                    updateSelectedStep((s) => ({
                      ...s,
                      midi: newM,
                      note: midiToNoteName(newM),
                      freq: midiToFreq(newM),
                    }));
                  }}
                  className="px-1.5 py-0.5 border border-current/20 hover:border-current cursor-pointer"
                  title="Semitone Down"
                >
                  -1st
                </button>
                <button
                  onClick={() => {
                    const newM = Math.min(108, activeSelectedStep.midi + 1);
                    updateSelectedStep((s) => ({
                      ...s,
                      midi: newM,
                      note: midiToNoteName(newM),
                      freq: midiToFreq(newM),
                    }));
                  }}
                  className="px-1.5 py-0.5 border border-current/20 hover:border-current cursor-pointer"
                  title="Semitone Up"
                >
                  +1st
                </button>
                <button
                  onClick={() => {
                    const newM = Math.min(108, activeSelectedStep.midi + 12);
                    updateSelectedStep((s) => ({
                      ...s,
                      midi: newM,
                      note: midiToNoteName(newM),
                      freq: midiToFreq(newM),
                    }));
                  }}
                  className="px-1.5 py-0.5 border border-current/20 hover:border-current cursor-pointer"
                  title="Octave Up"
                >
                  +1 Oct
                </button>
              </div>

              {/* Chromatic Piano Keys selector */}
              <div className="grid grid-cols-6 gap-1 pt-1 text-[10px]">
                {NOTE_NAMES.map((n) => {
                  const currentOctave = Math.floor(activeSelectedStep.midi / 12) - 1;
                  const newM = noteNameToMidi(`${n}${currentOctave}`);
                  const isCurrent = activeSelectedStep.midi % 12 === NOTE_NAMES.indexOf(n);
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        updateSelectedStep((s) => ({
                          ...s,
                          midi: newM,
                          note: `${n}${currentOctave}`,
                          freq: midiToFreq(newM),
                        }));
                      }}
                      className={`p-1 border text-center cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-current text-black font-bold border-current'
                          : 'border-current/20 hover:border-current/60'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Velocity & Dynamics */}
            <div className="space-y-2 border border-current/20 p-2.5 bg-black/40">
              <div className="text-[10px] opacity-60 font-bold uppercase">02. Dynamics &amp; Gate</div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>VELOCITY</span>
                  <span className="font-bold">{Math.round(activeSelectedStep.velocity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={activeSelectedStep.velocity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateSelectedStep((s) => ({ ...s, velocity: val }));
                  }}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span>GATE DURATION</span>
                  <span className="font-bold">{Math.round(activeSelectedStep.gate * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={activeSelectedStep.gate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateSelectedStep((s) => ({ ...s, gate: val }));
                  }}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() =>
                    updateSelectedStep((s) => ({
                      ...s,
                      slide: !s.slide,
                    }))
                  }
                  className={`w-full py-1 border text-[11px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                    activeSelectedStep.slide
                      ? 'bg-current text-black font-bold border-current'
                      : 'border-current/30 hover:border-current'
                  }`}
                >
                  <span>~ PORTAMENTO GLIDE</span>
                  <span className="opacity-80">[{activeSelectedStep.slide ? 'ON' : 'OFF'}]</span>
                </button>
              </div>
            </div>

            {/* Column 3 & 4: Parameter Lock Changes (FM Depth, Filter Cutoff, Pan, Particle) */}
            <div className="md:col-span-2 space-y-2 border border-current/20 p-2.5 bg-black/40">
              <div className="text-[10px] opacity-60 font-bold uppercase flex items-center justify-between">
                <span>03. Parameter Change Automation (P-Lock)</span>
                <span className="text-current font-normal text-[9px]">Targeted parameter per step</span>
              </div>

              {/* Param Type Select */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {(
                  [
                    { id: 'none', label: 'NONE' },
                    { id: 'fm_depth', label: 'FM MOD DEPTH' },
                    { id: 'filter_cutoff', label: 'FILTER CUTOFF' },
                    { id: 'pan', label: 'STEREO PAN' },
                    { id: 'particle_pitch', label: 'PARTICLE PITCH' },
                  ] as { id: StepParamType; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      let defaultVal = 0;
                      if (p.id === 'fm_depth') defaultVal = 160;
                      if (p.id === 'filter_cutoff') defaultVal = 3200;
                      if (p.id === 'pan') defaultVal = -0.7;
                      if (p.id === 'particle_pitch') defaultVal = 12;

                      updateSelectedStep((s) => ({
                        ...s,
                        paramType: p.id,
                        paramValue: p.id === 'none' ? 0 : s.paramValue || defaultVal,
                      }));
                    }}
                    className={`px-2 py-1 border cursor-pointer transition-colors ${
                      activeSelectedStep.paramType === p.id
                        ? 'bg-current text-black font-bold border-current'
                        : 'border-current/20 hover:border-current/60 opacity-80'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Param Value Slider */}
              {activeSelectedStep.paramType !== 'none' && (
                <div className="pt-2 space-y-2 border-t border-current/15">
                  {activeSelectedStep.paramType === 'fm_depth' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>AUDIO-RATE FM DEVIATION</span>
                        <span className="font-bold">{activeSelectedStep.paramValue} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="400"
                        step="5"
                        value={activeSelectedStep.paramValue}
                        onChange={(e) =>
                          updateSelectedStep((s) => ({ ...s, paramValue: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-current cursor-pointer"
                      />
                      <p className="text-[10px] opacity-60">
                        Sends frequency modulation burst from this oscillator to the next carrier voice.
                      </p>
                    </div>
                  )}

                  {activeSelectedStep.paramType === 'filter_cutoff' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>FILTER CUTOFF FREQUENCY</span>
                        <span className="font-bold">{Math.round(activeSelectedStep.paramValue)} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="14000"
                        step="50"
                        value={activeSelectedStep.paramValue}
                        onChange={(e) =>
                          updateSelectedStep((s) => ({ ...s, paramValue: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-current cursor-pointer"
                      />
                      <p className="text-[10px] opacity-60">
                        Ramps master multimode filter cutoff sharply on this step for dynamic timbral accents.
                      </p>
                    </div>
                  )}

                  {activeSelectedStep.paramType === 'pan' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>STEREO PANNING</span>
                        <span className="font-bold">
                          {activeSelectedStep.paramValue < 0
                            ? `${Math.abs(Math.round(activeSelectedStep.paramValue * 100))}% LEFT`
                            : activeSelectedStep.paramValue > 0
                            ? `${Math.round(activeSelectedStep.paramValue * 100)}% RIGHT`
                            : 'CENTER'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-1.0"
                        max="1.0"
                        step="0.05"
                        value={activeSelectedStep.paramValue}
                        onChange={(e) =>
                          updateSelectedStep((s) => ({ ...s, paramValue: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-current cursor-pointer"
                      />
                      <p className="text-[10px] opacity-60">
                        Pans this oscillator hard Left/Right on this step for rhythmic ping-pong stereo motion.
                      </p>
                    </div>
                  )}

                  {activeSelectedStep.paramType === 'particle_pitch' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>PARTICLE V2 GRANULAR PITCH SHIFT</span>
                        <span className="font-bold">
                          {activeSelectedStep.paramValue > 0
                            ? `+${activeSelectedStep.paramValue} ST`
                            : `${activeSelectedStep.paramValue} ST`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-24"
                        max="24"
                        step="1"
                        value={activeSelectedStep.paramValue}
                        onChange={(e) =>
                          updateSelectedStep((s) => ({ ...s, paramValue: parseInt(e.target.value, 10) }))
                        }
                        className="w-full accent-current cursor-pointer"
                      />
                      <p className="text-[10px] opacity-60">
                        Momentarily forces the granular delay into octave or harmonic micro-pitch intervals.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
