import React, { useState } from 'react';
import { RUST_PROJECT_FILES, RustFile } from '../data/rustCodebase';
import { Copy, Check, Download, Terminal, FolderTree } from 'lucide-react';

export const RustCodePane: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<RustFile>(RUST_PROJECT_FILES[1]); // main.rs default
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    // Combine all files into a consolidated bundle with delimiters or trigger download
    const bundle = RUST_PROJECT_FILES.map(
      (f) => `// ==========================================\n// FILE: ${f.path}\n// ==========================================\n\n${f.content}\n\n`
    ).join('\n');

    const blob = new Blob([bundle], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aura4_rust_crate_complete_sources.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-2 text-xs">
        <div>
          <span className="font-bold">STANDALONE RUST CRATE IMPLEMENTATION</span>
          <span className="opacity-60 ml-2 hidden sm:inline">
            RATATUI TUI + CPAL LOW-LATENCY SYNTHESIS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 border border-current/40 hover:border-current flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied ? 'COPIED!' : 'COPY FILE'}</span>
          </button>

          <button
            onClick={handleDownloadSingle}
            className="px-2.5 py-1 border border-current/40 hover:border-current flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
          >
            <Download size={12} />
            <span>SAVE {selectedFile.name}</span>
          </button>

          <button
            onClick={handleDownloadAll}
            className="px-3 py-1 border border-current bg-current text-black font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-sm"
          >
            <Terminal size={13} />
            <span>EXPORT ALL RUST SOURCES</span>
          </button>
        </div>
      </div>

      {/* Main Split: File Tree on left, Code editor on right */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* File List Navigation */}
        <div className="border border-current/25 bg-black/40 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold border-b border-current/15 pb-2 mb-2 opacity-80">
            <FolderTree size={13} />
            <span>CRATE STRUCTURE:</span>
          </div>
          {RUST_PROJECT_FILES.map((file) => {
            const isSelected = selectedFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-2 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-current text-black font-bold'
                    : 'text-current/70 hover:text-current hover:bg-current/10'
                }`}
              >
                <span>{file.path}</span>
                <span className="text-[10px] opacity-60">[{file.language}]</span>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-current/15 text-[11px] opacity-60 leading-normal">
            To build on your machine:
            <pre className="mt-1 p-1.5 bg-black border border-current/20 text-[10px] text-current/90 select-text">
              cargo run --release
            </pre>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="md:col-span-3 border border-current/35 bg-black/70 p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-current/20 pb-2 mb-3 text-xs">
            <span className="font-bold opacity-90">FILE: {selectedFile.path}</span>
            <span className="opacity-50 text-[11px]">{selectedFile.content.split('\n').length} LINES</span>
          </div>
          <pre className="text-xs font-mono leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto text-current/90 whitespace-pre select-text p-1">
            {selectedFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
