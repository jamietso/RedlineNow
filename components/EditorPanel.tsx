import React from 'react';
import { PanelProps } from '../types';
import { Trash2 } from 'lucide-react';

export const EditorPanel: React.FC<PanelProps> = ({ 
  title, 
  value, 
  onChange, 
  onClear,
  onScroll, 
  scrollRef,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="bg-slate-200 border-b border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between items-center shrink-0">
        <span>{title}</span>
        <div className="flex items-center gap-3">
          {onClear && value && value.length > 0 && (
            <button 
              onClick={onClear}
              className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
              title="Clear text"
            >
              <Trash2 size={14} />
              <span className="hidden xl:inline">Clear</span>
            </button>
          )}
          <span className="text-slate-400 font-normal normal-case">Editable</span>
        </div>
      </div>
      <textarea
        ref={scrollRef as React.RefObject<HTMLTextAreaElement>}
        className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white font-serif text-lg leading-relaxed text-slate-800 shadow-inner overflow-y-auto"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        onScroll={onScroll}
        placeholder="Paste your text here..."
        spellCheck={false}
      />
    </div>
  );
};