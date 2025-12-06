import React from 'react';
import { FileDiff, Download, Copy, Trash2, Link2, Unlink2, Sparkles, Settings2 } from 'lucide-react';
import { DiffMode } from '../services/diffService';

interface HeaderProps {
  onCopy: () => void;
  onExportPdf: () => void;
  onReset: () => void;
  onToggleSync: () => void;
  onGenerateSummary: () => void;
  diffMode: DiffMode;
  onDiffModeChange: (mode: DiffMode) => void;
  syncEnabled: boolean;
  stats: { insertions: number; deletions: number };
}

export const Header: React.FC<HeaderProps> = ({ 
  onCopy, 
  onExportPdf, 
  onReset, 
  onToggleSync,
  onGenerateSummary,
  diffMode,
  onDiffModeChange,
  syncEnabled,
  stats 
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20 sticky top-0 shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <FileDiff size={20} />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">Legal Redline</h1>
          <p className="text-xs text-slate-500">Professional Text Comparison</p>
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {/* Stats Pill */}
        <div className="hidden lg:flex items-center bg-slate-100 rounded-full px-4 py-1.5 text-xs font-medium border border-slate-200">
           <span className="text-red-600 mr-3">{stats.deletions} Deletions</span>
           <span className="w-px h-3 bg-slate-300 mr-3"></span>
           <span className="text-blue-600">{stats.insertions} Insertions</span>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block"></div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDiffModeChange(diffMode === 'char' ? 'word' : 'char')}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
            title={`Current Mode: ${diffMode === 'char' ? 'Character (Precise)' : 'Word (Readable)'}`}
          >
            <Settings2 size={16} />
            <span className="hidden md:inline">
              {diffMode === 'char' ? 'Char Level' : 'Word Level'}
            </span>
          </button>

          <button
            onClick={onGenerateSummary}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium rounded-md hover:from-indigo-700 hover:to-violet-700 shadow-sm transition-all active:scale-95"
            title="Generate AI Summary"
          >
            <Sparkles size={16} />
            <span className="hidden md:inline">AI Summary</span>
          </button>

          <button
            onClick={onToggleSync}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              syncEnabled 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-700'
            }`}
            title={syncEnabled ? "Scrolling is synchronized" : "Scrolling is independent"}
          >
            {syncEnabled ? <Link2 size={16} /> : <Unlink2 size={16} />}
            <span className="hidden md:inline">{syncEnabled ? 'Sync Scroll' : 'No Sync'}</span>
          </button>

          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
            title="Clear All Text"
          >
            <Trash2 size={16} />
            <span className="hidden md:inline">Clear All</span>
          </button>
          
          <button 
            onClick={onCopy}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm active:scale-95"
            title="Copy diff to clipboard"
          >
            <Copy size={16} />
            <span className="hidden sm:inline">Copy</span>
          </button>

          <button 
            onClick={onExportPdf}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95"
          >
            <Download size={16} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};