import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { EditorPanel } from './components/EditorPanel';
import { DiffPanel } from './components/DiffPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { PlaybookManager } from './components/PlaybookManager';
import { ImportModifiedModal } from './components/ImportModifiedModal';
import { computeDiff, getDiffStats, generateHtmlDiff, DiffMode } from './services/diffService';
import { segmentDiffIntoSentences, generateRedlineSummary } from './services/aiService';
import { exportWordDocument } from './services/wordService';
import { getApprovedRules } from './services/playbookService';
import { DiffPart, ScrollSource, Sentence, SummaryResult, PlaybookEntry, RichTextContent } from './types';
import { INITIAL_ORIGINAL, INITIAL_MODIFIED } from './constants';

export default function App() {
  const [original, setOriginal] = useState(INITIAL_ORIGINAL);
  const [originalRichText, setOriginalRichText] = useState<RichTextContent | undefined>();
  const [modified, setModified] = useState(INITIAL_MODIFIED);
  const [modifiedRichText, setModifiedRichText] = useState<RichTextContent | undefined>();
  const [diffMode, setDiffMode] = useState<DiffMode>('char');
  const [diffData, setDiffData] = useState<DiffPart[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isSyncScrolling, setIsSyncScrolling] = useState(true);
  
  // Playbook State - disabled for now (Coming Soon)
  // Clear any old localStorage entries and don't persist
  const [playbookEntries, setPlaybookEntries] = useState<PlaybookEntry[]>(() => {
    // Clear old entries from localStorage since feature is disabled
    if (typeof window !== 'undefined') {
      localStorage.removeItem('playbookEntries');
    }
    return [];
  });
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  
  // AI Summary State
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [highlightedSentenceId, setHighlightedSentenceId] = useState<string | null>(null);
  
  // Modal state for importing modified document
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Refs for scrolling synchronization
  const originalRef = useRef<HTMLDivElement | HTMLTextAreaElement>(null);
  const modifiedRef = useRef<HTMLDivElement | HTMLTextAreaElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  
  // Ref to prevent circular scroll event loops
  const isScrolling = useRef<ScrollSource>(ScrollSource.NONE);
  
  // Ref to track modal timeout to prevent clearing it unnecessarily
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we should show the import modal (original has content but modified is empty)
  useEffect(() => {
    // Helper to check if content exists (handles both plain text and rich text)
    const hasContent = (text: string, richText?: RichTextContent): boolean => {
      // Check plain text first
      if (text && typeof text === 'string' && text.trim().length > 0) return true;
      
      // Check rich text
      if (richText !== undefined && richText !== null) {
        if (typeof richText === 'string') {
          // For HTML strings, check if there's actual text content (not just tags)
          const trimmed = richText.trim();
          if (trimmed.length === 0) return false;
          // If it's HTML, check if there's text content beyond tags
          if (trimmed.includes('<')) {
            // Use DOMParser to extract text content
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(trimmed, 'text/html');
              const textContent = doc.body.textContent || '';
              return textContent.trim().length > 0;
            } catch {
              // Fallback: if parsing fails, check if there's text outside tags
              const textWithoutTags = trimmed.replace(/<[^>]*>/g, '').trim();
              return textWithoutTags.length > 0;
            }
          }
          return trimmed.length > 0;
        }
        // For JSONContent (TipTap), check if it has actual content
        if (typeof richText === 'object' && richText !== null) {
          const hasText = (node: any): boolean => {
            if (typeof node === 'string' && node.trim().length > 0) return true;
            if (node?.text && typeof node.text === 'string' && node.text.trim().length > 0) return true;
            if (Array.isArray(node?.content) && node.content.length > 0) {
              return node.content.some(hasText);
            }
            return false;
          };
          return hasText(richText);
        }
      }
      return false;
    };

    const hasOriginal = hasContent(original, originalRichText);
    const hasModified = hasContent(modified, modifiedRichText);
    
    // Clear any pending timeout when conditions change
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
      modalTimeoutRef.current = null;
    }
    
    // Determine if modal should be shown
    const shouldShow = hasOriginal && !hasModified;
    
    // Update modal state based on conditions
    // Use a small delay to batch rapid state updates, but keep it minimal
    if (shouldShow) {
      modalTimeoutRef.current = setTimeout(() => {
        // Double-check conditions haven't changed
        const stillHasOriginal = hasContent(original, originalRichText);
        const stillNoModified = !hasContent(modified, modifiedRichText);
        
        if (stillHasOriginal && stillNoModified) {
          setShowImportModal(true);
        }
        modalTimeoutRef.current = null;
      }, 150);
    } else {
      // Hide immediately if conditions aren't met
      setShowImportModal(false);
    }
    
    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }
    };
  }, [original, originalRichText, modified, modifiedRichText]);

  // Compute diff whenever text changes
  useEffect(() => {
    const originalContent = originalRichText || original;
    const modifiedContent = modifiedRichText || modified;
    
    const parts = computeDiff(originalContent, modifiedContent, diffMode);
    setDiffData(parts);
    
    const sents = segmentDiffIntoSentences(parts);
    setSentences(sents);
    
    // Invalidate summary when text changes
    if (summary) {
      setSummary(null);
      setHighlightedSentenceId(null);
    }
  }, [original, originalRichText, modified, modifiedRichText, diffMode]);

  // Sync scroll logic
  const handleScroll = useCallback((source: ScrollSource, el: HTMLElement) => {
    // If sync is disabled or we are already handling a scroll event, ignore.
    if (!isSyncScrolling || (isScrolling.current !== ScrollSource.NONE && isScrolling.current !== source)) return;
    
    isScrolling.current = source;

    // Calculate percentage - handle edge cases
    const scrollHeight = el.scrollHeight - el.offsetHeight;
    const percentage = scrollHeight > 0 ? el.scrollTop / scrollHeight : 0;

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
      const approvedRules = getApprovedRules(playbookEntries);
      const result = await generateRedlineSummary(sentences, approvedRules);
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
    setOriginalRichText(undefined);
    setModified('');
    setModifiedRichText(undefined);
    setShowImportModal(false);
    // Optionally focus the first input for convenience
    originalRef.current?.focus();
  };

  const handleExportWord = async () => {
    try {
      await exportWordDocument(diffData, 'redline-comparison.docx');
    } catch (err: any) {
      alert(`Error exporting Word document: ${err.message}`);
    }
  };

  const handleModalImport = (text: string, richText?: RichTextContent) => {
    setModified(text);
    if (richText) {
      setModifiedRichText(richText);
    }
    setShowImportModal(false);
  };

  const stats = getDiffStats(diffData);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header 
        onCopy={handleCopy} 
        onExportPdf={handleExportPDF}
        onExportWord={handleExportWord}
        onReset={handleResetAll}
        onToggleSync={() => setIsSyncScrolling(!isSyncScrolling)}
        onGenerateSummary={handleGenerateSummary}
        onOpenPlaybook={() => setIsPlaybookOpen(true)}
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
                  richTextValue={originalRichText}
                  onChange={setOriginal}
                  onRichTextChange={setOriginalRichText}
                  onClear={() => {
                    setOriginal('');
                    setOriginalRichText(undefined);
                    setShowImportModal(false);
                  }}
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
                  richTextValue={modifiedRichText}
                  onChange={setModified}
                  onRichTextChange={setModifiedRichText}
                  onClear={() => {
                    setModified('');
                    setModifiedRichText(undefined);
                  }}
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
              originalRichText={originalRichText}
              modifiedRichText={modifiedRichText}
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
        
        {isPlaybookOpen && (
          <PlaybookManager
            entries={playbookEntries}
            onEntriesChange={setPlaybookEntries}
            onClose={() => setIsPlaybookOpen(false)}
          />
        )}
      </main>
      
      {/* Import Modified Document Modal */}
      <ImportModifiedModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleModalImport}
        originalText={original}
        originalRichText={originalRichText}
      />
    </div>
  );
}