import React, { useState, useEffect } from 'react';
import { PanelProps } from '../types';
import { Code, Eye } from 'lucide-react';

export const DiffPanel: React.FC<PanelProps> = ({ 
  title, 
  diffParts, 
  sentences,
  highlightedSentenceId,
  onScroll, 
  scrollRef,
  className = "",
  id
}) => {
  const [isRawMode, setIsRawMode] = useState(false);

  useEffect(() => {
    if (highlightedSentenceId) {
      const el = document.getElementById(highlightedSentenceId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedSentenceId]);

  const renderPart = (part: any, index: number) => {
    if (part.added) {
      return (
        <span 
          key={index} 
          className="text-blue-700 underline decoration-blue-700 decoration-2 underline-offset-2"
          title="Insertion"
          style={{ textDecorationSkipInk: 'none', WebkitTextDecorationSkipInk: 'none' }}
        >
          {part.value}
        </span>
      );
    }
    if (part.removed) {
      return (
        <span 
          key={index} 
          className="text-red-600 line-through decoration-red-600 decoration-1"
          title="Deletion"
          style={{ textDecorationSkipInk: 'none', WebkitTextDecorationSkipInk: 'none' }}
        >
          {part.value}
        </span>
      );
    }
    return <span key={index} className="text-slate-900">{part.value}</span>;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white flex justify-between items-center shadow-md z-10 shrink-0">
        <span>{title}</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsRawMode(!isRawMode)}
            className="text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            title={isRawMode ? "Switch to Visual Redline" : "Switch to Raw Diff Format"}
          >
            {isRawMode ? <Eye size={14} /> : <Code size={14} />}
            <span className="hidden xl:inline">{isRawMode ? "Visual" : "Raw"}</span>
          </button>
        </div>
      </div>
      
      <div 
        id={id}
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        onScroll={onScroll}
        className="flex-1 w-full p-6 overflow-y-auto bg-white font-serif text-lg leading-relaxed text-slate-800 shadow-inner whitespace-pre-wrap"
      >
        {isRawMode ? (
          <div className="font-mono text-sm text-slate-700 selection:bg-indigo-100">
            {diffParts && diffParts.map((part, index) => {
              if (part.added) {
                return <span key={index} className="text-blue-700 font-bold">{`{++${part.value}++}`}</span>;
              }
              if (part.removed) {
                return <span key={index} className="text-red-600 font-bold">{`{--${part.value}--}`}</span>;
              }
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        ) : (
          <>
            {sentences ? (
              sentences.map((sentence) => (
                <span 
                  key={sentence.id} 
                  id={sentence.id}
                  className={`transition-colors duration-500 ${highlightedSentenceId === sentence.id ? 'bg-yellow-100 ring-2 ring-yellow-300 rounded-sm' : ''}`}
                >
                  {sentence.parts.map((part, index) => renderPart(part, index))}
                </span>
              ))
            ) : (
              <>
                {diffParts && diffParts.map((part, index) => renderPart(part, index))}
                {(!diffParts || diffParts.length === 0) && (
                  <span className="text-slate-400 italic font-sans text-base">No content to compare. Add text to Original and Modified panels.</span>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};