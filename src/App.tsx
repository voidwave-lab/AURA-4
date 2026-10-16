/**
 * AURA-4: Terminal (TUI) Analog Waveform Synthesizer
 * 4-Oscillator Analog Emulation with 4x4 FM Cross-Modulation,
 * Red Panda Particle V2 Granular Glitch Delay, and Character-Based Waveform Visualization.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from './audio/AudioEngine';
import {
  OscillatorConfig,
  FmMatrix,
  GranularConfig,
  EffectsConfig,
  ColorTheme,
  Preset,
  SampleConfig,
  LfoMatrixConfig,
  SequencerConfig,
} from './types/synth';
import { PRESETS } from './data/presets';
import { TuiHeader } from './components/TuiHeader';
import { TuiTabs, TabId } from './components/TuiTabs';
import { OscillatorsPane } from './components/OscillatorsPane';
import { FmMatrixPane } from './components/FmMatrixPane';
import { LfoMatrixPane } from './components/LfoMatrixPane';
import { SequencerPane } from './components/SequencerPane';
import { ParticleDelayPane } from './components/ParticleDelayPane';
import { EffectsPane } from './components/EffectsPane';
import { SamplePane } from './components/SamplePane';
import { VisualizerPane } from './components/VisualizerPane';
import { PresetsPane } from './components/PresetsPane';
import { RustCodePane } from './components/RustCodePane';
import { TuiFooter } from './components/TuiFooter';
import { HelpModal } from './components/HelpModal';
import { Volume2, Play } from 'lucide-react';

export default function App() {
  const defaultPreset = PRESETS[0];

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>('oscillators');
  const [selectedOscIndex, setSelectedOscIndex] = useState<number>(0);
  const [currentPresetId, setCurrentPresetId] = useState<string>(defaultPreset.id);

  // Synth state initialized from first preset
  const [oscillators, setOscillators] = useState<OscillatorConfig[]>(defaultPreset.oscillators);
  const [fmMatrix, setFmMatrix] = useState<FmMatrix>(defaultPreset.fmMatrix);
  const [granular, setGranular] = useState<GranularConfig>(defaultPreset.granular);
  const [effects, setEffects] = useState<EffectsConfig>(defaultPreset.effects);
  const [sampleConfig, setSampleConfig] = useState<SampleConfig>(audioEngine.getSampleConfig());
  const [lfoMatrix, setLfoMatrix] = useState<LfoMatrixConfig>(audioEngine.getLfoConfig());
  const [sequencer, setSequencer] = useState<SequencerConfig>(audioEngine.getSequencerConfig());

  // Terminal Display & Aesthetics
  const [theme, setTheme] = useState<ColorTheme>('amber');
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [hasStartedOnce, setHasStartedOnce] = useState<boolean>(false);

  // Telemetry for header meters
  const [meterRms, setMeterRms] = useState<number>(0);
  const [meterPeak, setMeterPeak] = useState<number>(0);

  // Poll visualizer levels for header meters
  useEffect(() => {
    const meterInterval = setInterval(() => {
      const data = audioEngine.getVisualizerData();
      setMeterRms(data.rms);
      setMeterPeak(data.peak);
    }, 100);
    return () => clearInterval(meterInterval);
  }, []);

  // Update audio engine on state changes
  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateOscillators(oscillators);
    }
  }, [oscillators, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateFmMatrix(fmMatrix);
    }
  }, [fmMatrix, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateGranular(granular);
    }
  }, [granular, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.applyEffectsConfig(effects);
    }
  }, [effects, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateLfoMatrix(lfoMatrix);
    }
  }, [lfoMatrix, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateSequencerConfig(sequencer);
    }
  }, [sequencer, isPlaying]);

  // Master Play Toggle
  const handleTogglePlay = useCallback(async () => {
    if (!hasStartedOnce) {
      await audioEngine.init();
      audioEngine.updateOscillators(oscillators);
      audioEngine.updateFmMatrix(fmMatrix);
      audioEngine.updateLfoMatrix(lfoMatrix);
      audioEngine.updateSequencerConfig(sequencer);
      audioEngine.updateGranular(granular);
      audioEngine.applyEffectsConfig(effects);
      setHasStartedOnce(true);
      setIsPlaying(true);
    } else {
      const active = await audioEngine.togglePlay();
      setIsPlaying(active);
    }
  }, [hasStartedOnce, oscillators, fmMatrix, lfoMatrix, sequencer, granular, effects]);

  // Toggle Recording
  const handleToggleRecord = useCallback(() => {
    if (!isRecording) {
      const started = audioEngine.startRecording();
      if (started) setIsRecording(true);
    } else {
      audioEngine.stopRecordingAndDownload(`aura4_${currentPresetId}_${Date.now()}.webm`);
      setIsRecording(false);
    }
  }, [isRecording, currentPresetId]);

  // Load Preset
  const handleLoadPreset = useCallback((preset: Preset) => {
    setCurrentPresetId(preset.id);
    setOscillators(preset.oscillators);
    setFmMatrix(preset.fmMatrix);
    setGranular(preset.granular);
    setEffects(preset.effects);
    if (preset.lfoMatrix) {
      setLfoMatrix(preset.lfoMatrix);
    }
    if (preset.sequencer) {
      setSequencer(preset.sequencer);
    }

    if (hasStartedOnce) {
      audioEngine.updateOscillators(preset.oscillators);
      audioEngine.updateFmMatrix(preset.fmMatrix);
      if (preset.lfoMatrix) {
        audioEngine.updateLfoMatrix(preset.lfoMatrix);
      }
      if (preset.sequencer) {
        audioEngine.updateSequencerConfig(preset.sequencer);
      }
      audioEngine.updateGranular(preset.granular);
      audioEngine.applyEffectsConfig(preset.effects);
    }
  }, [hasStartedOnce]);

  // Cycle Presets
  const handleCyclePreset = useCallback(() => {
    const curIdx = PRESETS.findIndex((p) => p.id === currentPresetId);
    const nextIdx = (curIdx + 1) % PRESETS.length;
    handleLoadPreset(PRESETS[nextIdx]);
  }, [currentPresetId, handleLoadPreset]);

  // Randomize / Mutate Patch
  const handleMutate = useCallback(() => {
    const baseFreqs = [55, 110, 165, 220, 330, 440, 130.81, 196, 261.63];
    const newOscs = oscillators.map((osc) => {
      const randomFreq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)] * (0.8 + Math.random() * 0.4);
      return {
        ...osc,
        freq: parseFloat(randomFreq.toFixed(1)),
        fine: Math.floor(Math.random() * 30 - 15),
        pan: parseFloat(((Math.random() * 2 - 1) * 0.7).toFixed(2)),
        driftDepth: parseFloat((Math.random() * 20 + 2).toFixed(1)),
      };
    });

    const newMatrix: FmMatrix = fmMatrix.map((row) =>
      row.map(() => (Math.random() < 0.45 ? Math.floor(Math.random() * 220) : 0))
    );

    const newGran: GranularConfig = {
      ...granular,
      grainSize: Math.floor(Math.random() * 350 + 20),
      density: Math.floor(Math.random() * 18 + 4),
      feedback: parseFloat((Math.random() * 0.6 + 0.1).toFixed(2)),
      reverseProb: Math.floor(Math.random() * 60),
    };

    setOscillators(newOscs);
    setFmMatrix(newMatrix);
    setGranular(newGran);

    if (hasStartedOnce) {
      audioEngine.updateOscillators(newOscs);
      audioEngine.updateFmMatrix(newMatrix);
      audioEngine.updateGranular(newGran);
    }
  }, [oscillators, fmMatrix, granular, hasStartedOnce]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'Tab':
          e.preventDefault();
          const tabOrder: TabId[] = ['oscillators', 'fm', 'lfo', 'sequencer', 'particle', 'effects', 'sampler', 'scopes', 'presets', 'rust'];
          const currentTabIdx = tabOrder.indexOf(activeTab);
          const nextTabIdx = e.shiftKey
            ? (currentTabIdx - 1 + tabOrder.length) % tabOrder.length
            : (currentTabIdx + 1) % tabOrder.length;
          setActiveTab(tabOrder[nextTabIdx]);
          break;
        case '1':
          setActiveTab('oscillators');
          setSelectedOscIndex(0);
          break;
        case '2':
          setActiveTab('fm');
          setSelectedOscIndex(1);
          break;
        case '3':
          setActiveTab('lfo');
          break;
        case '4':
          setActiveTab('sequencer');
          break;
        case '5':
          setActiveTab('particle');
          setSelectedOscIndex(2);
          break;
        case '6':
          setActiveTab('effects');
          setSelectedOscIndex(3);
          break;
        case '7':
          setActiveTab('sampler');
          break;
        case '8':
          setActiveTab('scopes');
          break;
        case '9':
          setActiveTab('presets');
          break;
        case '0':
          setActiveTab('rust');
          break;
        case 'r':
        case 'R':
          handleToggleRecord();
          break;
        case 'm':
        case 'M':
          handleMutate();
          break;
        case 'p':
        case 'P':
          handleCyclePreset();
          break;
        case 'v':
        case 'V':
          setCrtEnabled((prev) => !prev);
          break;
        case 'f':
        case 'F':
          setGranular((prev) => ({ ...prev, freeze: !prev.freeze }));
          break;
        case '?':
          setIsHelpOpen((prev) => !prev);
          break;
        case 'Escape':
          setIsHelpOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    handleTogglePlay,
    handleToggleRecord,
    handleMutate,
    handleCyclePreset,
  ]);

  // Theme styling classes
  const getThemeStyles = () => {
    switch (theme) {
      case 'amber':
        return {
          bg: 'bg-[#0f0b02]',
          text: 'text-[#ffb000]',
          border: 'border-[#ffb000]',
          glow: 'glow-amber',
        };
      case 'green':
        return {
          bg: 'bg-[#020e04]',
          text: 'text-[#00ff66]',
          border: 'border-[#00ff66]',
          glow: 'glow-green',
        };
      case 'cyan':
        return {
          bg: 'bg-[#010e14]',
          text: 'text-[#00f0ff]',
          border: 'border-[#00f0ff]',
          glow: 'glow-cyan',
        };
      case 'matrix':
        return {
          bg: 'bg-[#020c04]',
          text: 'text-[#22c55e]',
          border: 'border-[#22c55e]',
          glow: 'glow-matrix',
        };
      case 'slate':
      default:
        return {
          bg: 'bg-[#090d16]',
          text: 'text-[#e2e8f0]',
          border: 'border-[#64748b]',
          glow: '',
        };
    }
  };

  const currentStyle = getThemeStyles();

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-300 font-mono ${currentStyle.bg} ${currentStyle.text} ${
        crtEnabled ? 'crt-overlay crt-vignette' : ''
      } ${currentStyle.glow}`}
    >
      <div className="max-w-7xl mx-auto p-3 sm:p-5 flex flex-col min-h-screen">
        {/* Terminal Header */}
        <TuiHeader
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          isRecording={isRecording}
          onToggleRecord={handleToggleRecord}
          theme={theme}
          onThemeChange={setTheme}
          crtEnabled={crtEnabled}
          onToggleCrt={() => setCrtEnabled(!crtEnabled)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onMutate={handleMutate}
          rms={meterRms}
          peak={meterPeak}
        />

        {/* First Interaction Launch Callout if not started */}
        {!hasStartedOnce && (
          <div className="my-3 p-3.5 border-2 border-current bg-current/10 flex flex-wrap items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <Volume2 size={18} />
              <div>
                <span className="font-bold text-xs uppercase block">
                  TERMINAL AUDIO ENGINE READY FOR INITIALIZATION
                </span>
                <span className="text-[11px] opacity-75">
                  Web Audio API synthesis requires user activation. Click below or press [SPACE] to start real-time analog soundscape.
                </span>
              </div>
            </div>
            <button
              onClick={handleTogglePlay}
              className="px-4 py-2 border border-current bg-current text-black font-bold text-xs flex items-center gap-2 cursor-pointer hover:opacity-90 shadow-md"
            >
              <Play size={14} fill="currentColor" />
              <span>INITIALIZE SYNTH [SPACE]</span>
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <TuiTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Workstation Viewport */}
        <main className="flex-1 my-2">
          {activeTab === 'oscillators' && (
            <OscillatorsPane
              oscillators={oscillators}
              onChange={setOscillators}
              selectedOscIndex={selectedOscIndex}
              onSelectOsc={setSelectedOscIndex}
            />
          )}

          {activeTab === 'fm' && (
            <FmMatrixPane
              fmMatrix={fmMatrix}
              onChange={setFmMatrix}
              oscillators={oscillators}
            />
          )}

          {activeTab === 'lfo' && (
            <LfoMatrixPane
              config={lfoMatrix}
              onChange={setLfoMatrix}
            />
          )}

          {activeTab === 'sequencer' && (
            <SequencerPane
              config={sequencer}
              onChange={setSequencer}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
            />
          )}

          {activeTab === 'particle' && (
            <ParticleDelayPane
              config={granular}
              onChange={setGranular}
            />
          )}

          {activeTab === 'effects' && (
            <EffectsPane
              effects={effects}
              onChange={setEffects}
            />
          )}

          {activeTab === 'sampler' && (
            <SamplePane
              config={sampleConfig}
              onChange={setSampleConfig}
              onAudioStartNeeded={async () => {
                if (!hasStartedOnce) {
                  await handleTogglePlay();
                }
              }}
            />
          )}

          {activeTab === 'scopes' && (
            <VisualizerPane />
          )}

          {activeTab === 'presets' && (
            <PresetsPane
              currentPresetId={currentPresetId}
              onLoadPreset={handleLoadPreset}
              oscillators={oscillators}
              onUpdateOscillators={setOscillators}
              onMutate={handleMutate}
            />
          )}

          {activeTab === 'rust' && (
            <RustCodePane />
          )}
        </main>

        {/* Terminal Footer with Shortcut Command Badges */}
        <TuiFooter
          onOpenHelp={() => setIsHelpOpen(true)}
          onTogglePlay={handleTogglePlay}
          onToggleRecord={handleToggleRecord}
          onMutate={handleMutate}
          onToggleCrt={() => setCrtEnabled(!crtEnabled)}
          isPlaying={isPlaying}
          isRecording={isRecording}
        />

        {/* Help Cheatsheet Modal */}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </div>
    </div>
  );
}
