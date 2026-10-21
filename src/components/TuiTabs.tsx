// SPDX-License-Identifier: GPL-3.0-or-later
import React from 'react';

export type TabId = 'oscillators' | 'fm' | 'lfo' | 'sequencer' | 'particle' | 'effects' | 'sampler' | 'scopes' | 'presets' | 'rust';

interface TuiTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export const TuiTabs: React.FC<TuiTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabId; label: string; num: string }[] = [
    { id: 'oscillators', label: 'OSCILLATORS', num: '1' },
    { id: 'fm', label: 'FM MATRIX', num: '2' },
    { id: 'lfo', label: 'LFO MATRIX', num: '3' },
    { id: 'sequencer', label: 'STEP SEQUENCER', num: '4' },
    { id: 'particle', label: 'PARTICLE V2 DELAY', num: '5' },
    { id: 'effects', label: 'EFFECTS RACK', num: '6' },
    { id: 'sampler', label: 'TAPE SAMPLER', num: '7' },
    { id: 'scopes', label: 'CHARACTER SCOPES', num: '8' },
    { id: 'presets', label: 'PRESETS & DRONES', num: '9' },
    { id: 'rust', label: 'RUST SOURCE CRATE', num: '0' },
  ];

  return (
    <nav className="flex items-center gap-1 my-3 overflow-x-auto pb-1 text-xs font-mono select-none border-b border-current/15">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 transition-all flex items-center gap-1.5 border whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-current text-black border-current font-bold shadow-sm'
                : 'border-current/20 hover:border-current/60 text-current/80 hover:text-current hover:bg-current/5'
            }`}
          >
            <span className={isActive ? 'opacity-80' : 'opacity-40'}>[{tab.num}]</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
