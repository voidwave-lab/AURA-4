// SPDX-License-Identifier: GPL-3.0-or-later
import React from 'react';

interface TuiFooterProps {
  onOpenHelp: () => void;
  onTogglePlay: () => void;
  onToggleRecord: () => void;
  onMutate: () => void;
  onToggleCrt: () => void;
  isPlaying: boolean;
  isRecording: boolean;
}

export const TuiFooter: React.FC<TuiFooterProps> = ({
  onOpenHelp,
  onTogglePlay,
  onToggleRecord,
  onMutate,
  onToggleCrt,
  isPlaying,
  isRecording,
}) => {
  return (
    <footer className="border-t border-current/20 pt-2.5 mt-4 text-[11px] font-mono select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 opacity-85">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold opacity-60">HOTKEYS:</span>

          <button
            onClick={onTogglePlay}
            className="hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="border border-current/40 px-1 py-0.2 bg-current/10 font-bold">SPACE</span>
            <span>{isPlaying ? 'MUTE' : 'START'}</span>
          </button>

          <span className="flex items-center gap-1">
            <span className="border border-current/40 px-1 py-0.2 bg-current/10 font-bold">TAB</span>
            <span>CYCLE TABS</span>
          </span>

          <span className="flex items-center gap-1">
            <span className="border border-current/40 px-1 py-0.2 bg-current/10 font-bold">1-0</span>
            <span>PANE JUMP</span>
          </span>

          <button
            onClick={onToggleRecord}
            className="hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="border border-current/40 px-1 py-0.2 bg-current/10 font-bold">R</span>
            <span>{isRecording ? 'STOP REC' : 'REC WAV'}</span>
          </button>

          <button
            onClick={onMutate}
            className="hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="border border-current/40 px-1 py-0.2 bg-current/10 font-bold">M</span>
            <span>MUTATE</span>
          </button>

          <button
            onClick={onToggleCrt}
            className="hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="border border-current/40 px-1 py-0.2 bg-current/10 font-bold">V</span>
            <span>CRT SCANLINES</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <span className="border border-current/40 px-1 py-0.2 bg-current/10 font-bold">?</span>
            <span>HELP</span>
          </button>
        </div>

        <div className="text-[10px] opacity-50 hidden sm:inline">
          BUFFER: 128 SAMPLES · NON-BLOCKING DSP
        </div>
      </div>
    </footer>
  );
};
