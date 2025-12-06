import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { EditorPanel } from './components/EditorPanel';
import { DiffPanel } from './components/DiffPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { computeDiff, getDiffStats, generateHtmlDiff, DiffMode } from './services/diffService';
import { segmentDiffIntoSentences, generateRedlineSummary } from './services/aiService';
import { DiffPart, ScrollSource, Sentence, SummaryResult } from './types';
import { INITIAL_ORIGINAL, INITIAL_MODIFIED } from './constants';

export default function App() {
  const [original, setOriginal] = useState(INITIAL_ORIGINAL);
  const [modified, setModified] = useState(INITIAL_MODIFIED);
  const [diffMode, setDiffMode] = useState<DiffMode>('char');
  const [diffData, setDiffData] = useState<DiffPart[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isSyncScrolling, setIsSyncScrolling] = useState(true);
  
  // AI Summary State
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [highlightedSentenceId, setHighlightedSentenceId] = useState<string | null>(null);
  
  // Refs for scrolling synchronization
  const originalRef = useRef<HTMLTextAreaElement>(null);
  const modifiedRef = useRef<HTMLTextAreaElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  
  // Ref to prevent circular scroll event loops
  const isScrolling = useRef<ScrollSource>(ScrollSource.NONE);

  // Compute diff whenever text changes
  useEffect(() => {
    // Simple debounce for very long text could be added here if needed, 
    // but React 18 auto-batching handles this reasonably well for typical legal docs.
    const parts = computeDiff(original, modified, diffMode);
    setDiffData(parts);
    
    const sents = segmentDiffIntoSentences(parts);
    setSentences(sents);
    
    // Invalidate summary when text changes
    if (summary) {
      setSummary(null);
      setHighlightedSentenceId(null);
    }
  }, [original, modified, diffMode]);

  // Sync scroll logic
  const handleScroll = useCallback((source: ScrollSource, el: HTMLElement) => {
    // If sync is disabled or we are already handling a scroll event, ignore.
    if (!isSyncScrolling || (isScrolling.current !== ScrollSource.NONE && isScrolling.current !== source)) return;
    
    isScrolling.current = source;

    // Calculate percentage
    const percentage = el.scrollTop / (el.scrollHeight - el.offsetHeight);

    const syncTo = (ref: React.RefObject<HTMLElement>) => {
      if (ref.current && ref.current !== el) {
        // Guard against division by zero or NaN if elements are hidden/empty
        if (ref.current.scrollHeight > ref.current.offsetHeight) {
           ref.current.scrollTop = percentage * (ref.current.scrollHeight - ref.current.offsetHeight);
        } else {
           ref.current.scrollTop = 0;
        }
      }
    };

    if (source === ScrollSource.ORIGINAL) {
      syncTo(modifiedRef);
      syncTo(diffRef);
    } else if (source === ScrollSource.MODIFIED) {
      syncTo(originalRef);
      syncTo(diffRef);
    } else if (source === ScrollSource.DIFF) {
      syncTo(originalRef);
      syncTo(modifiedRef);
    }

    // Debounce resetting the scroll lock
    const timeout = setTimeout(() => {
      isScrolling.current = ScrollSource.NONE;
    }, 50);

    return () => clearTimeout(timeout);
  }, [isSyncScrolling]);

  const handleGenerateSummary = async () => {
    setIsSummaryOpen(true);
    if (summary) return; 
    
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const result = await generateRedlineSummary(sentences);
      setSummary(result);
    } catch (err: any) {
      setSummaryError(err.message || "Failed to generate summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleCopy = async () => {
    try {
      const htmlContent = generateHtmlDiff(diffData);
      // For plain text, we just want the raw text content
      const textContent = diffData.map(p => p.value).join('');
      
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([textContent], { type: 'text/plain' });
      
      // Use the Clipboard API to write both HTML and plain text
      // This ensures formatting (colors, strikethrough) AND line breaks are preserved
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      })];
      
      await navigator.clipboard.write(data);
      alert('Changes copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
      // Fallback for older browsers or if permission denied
      try {
        const diffElement = document.getElementById('diff-output-content');
        if (diffElement) {
          const range = document.createRange();
          range.selectNode(diffElement);
          const selection = window.getSelection();
          if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
              document.execCommand('copy');
              selection.removeAllRanges();
              alert('Changes copied to clipboard (Fallback method)!');
          }
        }
      } catch (fallbackErr) {
        alert('Failed to copy changes.');
      }
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleResetAll = () => {
    setOriginal('');
    setModified('');
    // Optionally focus the first input for convenience
    originalRef.current?.focus();
  };

  const stats = getDiffStats(diffData);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header 
        onCopy={handleCopy} 
        onExportPdf={handleExportPDF} 
        onReset={handleResetAll}
        onToggleSync={() => setIsSyncScrolling(!isSyncScrolling)}
        onGenerateSummary={handleGenerateSummary}
        diffMode={diffMode}
        onDiffModeChange={setDiffMode}
        syncEnabled={isSyncScrolling}
        stats={stats}
      />
      
      <main className="flex-1 overflow-hidden flex relative">
        <div className="flex-1 p-4 overflow-hidden min-w-0">
          <div className={`grid gap-4 h-full max-w-[1920px] mx-auto ${isSummaryOpen ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
            
            {/* Panel 1: Original */}
            {!isSummaryOpen && (
              <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <EditorPanel 
                  title="Original Text" 
                  value={original} 
                  onChange={setOriginal}
                  onClear={() => setOriginal('')}
                  scrollRef={originalRef}
                  onScroll={(e) => handleScroll(ScrollSource.ORIGINAL, e.currentTarget)}
                />
              </div>
            )}

            {/* Panel 2: Modified */}
            {!isSummaryOpen && (
              <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <EditorPanel 
                  title="Modified Text" 
                  value={modified} 
                  onChange={setModified}
                  onClear={() => setModified('')}
                  scrollRef={modifiedRef}
                  onScroll={(e) => handleScroll(ScrollSource.MODIFIED, e.currentTarget)}
                />
              </div>
            )}

            {/* Panel 3: Diff View */}
          <div className="h-full bg-white rounded-lg shadow-lg border border-indigo-100 overflow-hidden relative ring-1 ring-indigo-500/10">
            <DiffPanel 
              id="diff-output-content"
              title="Redline Comparison" 
              diffParts={diffData}
              sentences={sentences}
              highlightedSentenceId={highlightedSentenceId}
              scrollRef={diffRef}
              onScroll={(e) => handleScroll(ScrollSource.DIFF, e.currentTarget)}
            />
          </div>

        </div>
        </div>
        
        {isSummaryOpen && (
          <SummaryPanel 
            summary={summary}
            isLoading={isGeneratingSummary}
            error={summaryError}
            onItemClick={setHighlightedSentenceId}
            onClose={() => setIsSummaryOpen(false)}
          />
        )}
      </main>
    </div>
  );
}