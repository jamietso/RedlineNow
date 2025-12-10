import React, { useState, useEffect, useMemo } from 'react';
import { PanelProps, RichTextContent } from '../types';
import { Code, Eye, FileText } from 'lucide-react';
import { generateMarkedHtml } from '../services/diffService';

export const DiffPanel: React.FC<PanelProps> = ({ 
  title, 
  diffParts, 
  sentences,
  highlightedSentenceId,
  onScroll, 
  scrollRef,
  className = "",
  id,
  originalRichText,
  modifiedRichText
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

  // Helper to strip HTML tags and get plain text
  const stripHtml = (text: string): string => {
    if (typeof document === 'undefined') {
      return text.replace(/<[^>]*>/g, '');
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || text;
  };

  // Generate marked HTML with diff styling
  const markedHtml = useMemo(() => {
    if (!diffParts || diffParts.length === 0) return null;
    
    // Check if we have rich text content
    const modifiedHtml = typeof modifiedRichText === 'string' ? modifiedRichText : null;
    const originalHtml = typeof originalRichText === 'string' ? originalRichText : null;
    
    // Use the new HTML generation function if we have rich text
    if (modifiedHtml || originalHtml) {
      return generateMarkedHtml(originalHtml, modifiedHtml, diffParts);
    }
    
    return null;
  }, [diffParts, originalRichText, modifiedRichText]);

  // Check if we should use HTML rendering
  const useHtmlRendering = markedHtml !== null && !isRawMode;

  // Helper to render text with formatting if available (for fallback text mode)
  const renderTextWithFormatting = (text: string, formatting?: any) => {
    const cleanText = stripHtml(text);
    
    if (formatting && (formatting.bold || formatting.italic || formatting.underline)) {
      let content: React.ReactNode = cleanText;
      
      if (formatting.underline) {
        content = <u>{content}</u>;
      }
      if (formatting.italic) {
        content = <em>{content}</em>;
      }
      if (formatting.bold) {
        content = <strong>{content}</strong>;
      }
      return content;
    }
    
    return cleanText;
  };

  const renderPart = (part: any, index: number | string) => {
    const displayValue = stripHtml(part.value);
    
    if (part.added) {
      return (
        <span 
          key={index} 
          className="text-blue-700 underline decoration-blue-700 decoration-2 underline-offset-2"
          title="Insertion"
          style={{ textDecorationSkipInk: 'none', WebkitTextDecorationSkipInk: 'none' } as React.CSSProperties}
        >
          {renderTextWithFormatting(displayValue, part.formatting)}
        </span>
      );
    }
    if (part.removed) {
      return (
        <span 
          key={index}
          className="text-red-600 line-through decoration-red-600 decoration-1"
          title="Deletion"
          style={{ textDecorationSkipInk: 'none', WebkitTextDecorationSkipInk: 'none' } as React.CSSProperties}
        >
          {renderTextWithFormatting(displayValue, part.formatting)}
        </span>
      );
    }
    return (
      <span key={index} className="text-slate-900">
        {renderTextWithFormatting(displayValue, part.formatting)}
      </span>
    );
  };

  // Render fallback text-based diff (when no HTML available)
  const renderTextDiff = () => {
    if (!diffParts || diffParts.length === 0) {
      return (
        <span className="text-slate-400 italic font-sans text-base">
          No content to compare. Add text to Original and Modified panels.
        </span>
      );
    }

    return diffParts.map((part, index) => {
      const parts: React.ReactNode[] = [];
      const lines = part.value.split('\n');
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          parts.push(<br key={`br-${index}-${lineIndex}`} />);
        }
        if (line) {
          parts.push(renderPart({ ...part, value: line }, `${index}-${lineIndex}`));
        }
      });
      return <React.Fragment key={index}>{parts}</React.Fragment>;
    });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white flex justify-between items-center shadow-md z-10 shrink-0 h-[42px]">
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
      
      {/* Spacer to align with the B/I/U toolbar in Editor panels */}
      <div className="bg-slate-100 border-b border-slate-300 shrink-0 h-[42px]" />
      
      <div 
        id={id}
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        onScroll={onScroll}
        className="flex-1 w-full p-6 overflow-y-auto bg-white font-serif text-lg leading-relaxed text-slate-800 shadow-inner"
      >
        {/* Check if we only have removed parts (original content but no modified) */}
        {diffParts && diffParts.length > 0 && diffParts.every(part => part.removed) && !diffParts.some(part => part.added) ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-slate-400 mb-4">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
            </div>
            <p className="text-slate-500 font-sans text-base max-w-md">
              No comparison available. Import or paste a modified document to see the redline comparison.
            </p>
          </div>
        ) : isRawMode ? (
          <div className="font-mono text-sm text-slate-700 selection:bg-indigo-100">
            {diffParts && diffParts.map((part, index) => {
              const cleanValue = stripHtml(part.value);
              if (part.added) {
                return <span key={index} className="text-blue-700 font-bold">{`{++${cleanValue}++}`}</span>;
              }
              if (part.removed) {
                return <span key={index} className="text-red-600 font-bold">{`{--${cleanValue}--}`}</span>;
              }
              return <span key={index}>{cleanValue}</span>;
            })}
          </div>
        ) : useHtmlRendering ? (
          // Render HTML directly with diff markers - preserves paragraph structure
          <div 
            className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: markedHtml! }}
            style={{
              // CSS for diff markers
              // ins = additions (blue underline)
              // del = deletions (red strikethrough)
            }}
          />
        ) : (
          <>
            {sentences ? (
              sentences.map((sentence, sentenceIndex) => (
                <React.Fragment key={sentence.id}>
                  <span 
                    id={sentence.id}
                    className={`transition-colors duration-500 ${highlightedSentenceId === sentence.id ? 'bg-yellow-100 ring-2 ring-yellow-300 rounded-sm' : ''}`}
                  >
                    {sentence.parts.map((part, index) => renderPart(part, index))}
                  </span>
                  {sentenceIndex < sentences.length - 1 && <br />}
                </React.Fragment>
              ))
            ) : (
              renderTextDiff()
            )}
          </>
        )}
      </div>
      
      {/* Inject CSS for diff markers */}
      <style>{`
        .prose ins {
          color: #1d4ed8;
          text-decoration: underline;
          text-decoration-color: #1d4ed8;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
          background: none;
        }
        .prose del {
          color: #dc2626;
          text-decoration: line-through;
          text-decoration-color: #dc2626;
        }
      `}</style>
    </div>
  );
};
