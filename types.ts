import React from 'react';

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface PanelProps {
  title: string;
  isReadOnly?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  diffParts?: DiffPart[];
  sentences?: Sentence[];
  highlightedSentenceId?: string | null;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  scrollRef?: React.RefObject<HTMLDivElement | HTMLTextAreaElement>;
  className?: string;
  id?: string;
}

export enum ScrollSource {
  NONE,
  ORIGINAL,
  MODIFIED,
  DIFF,
}

export interface Sentence {
  id: string;
  parts: DiffPart[];
  hasEdits: boolean;
  rawText: string;
}

export interface AISummaryItem {
  sentenceId: string;
  originalText: string;
  description: string;
}

export interface SummaryResult {
  items: AISummaryItem[];
  highLevelSummary: string;
}