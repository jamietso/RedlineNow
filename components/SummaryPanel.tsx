import React from 'react';
import { SummaryResult } from '../types';
import { Sparkles, AlertCircle, Loader2, X, ChevronRight } from 'lucide-react';

interface SummaryPanelProps {
  summary: SummaryResult | null;
  isLoading: boolean;
  error: string | null;
  onItemClick: (id: string) => void;
  onClose: () => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  summary,
  isLoading,
  error,
  onItemClick,
  onClose
}) => {
  return (
    <div className="w-96 h-full bg-white shadow-xl border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50">
        <div className="flex items-center gap-2 text-indigo-700 font-bold">
          <Sparkles size={20} />
          <h2>AI Summary</h2>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p>Analyzing changes...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Error</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && summary && (
          <div className="space-y-6">
            <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-2">Executive Summary</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {summary.highLevelSummary}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Detailed Changes</h3>
              <div className="space-y-3">
                {summary.items.map((item) => (
                  <button
                    key={item.sentenceId}
                    onClick={() => onItemClick(item.sentenceId)}
                    className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-1 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={16} />
                      </div>
                      <p className="text-sm text-slate-700 group-hover:text-slate-900">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && !error && !summary && (
           <div className="text-center text-slate-500 mt-10">
             <p>Click "Generate Summary" to analyze the redline.</p>
           </div>
        )}
      </div>
    </div>
  );
};
