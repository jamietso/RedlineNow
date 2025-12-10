import React from 'react';
import { JSONContent } from '@tiptap/core';

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
  formatting?: RichTextFormatting;
  changeId?: string;
}

export interface RichTextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type RichTextContent = string | JSONContent;

export interface PanelProps {
  title: string;
  isReadOnly?: boolean;
  value?: string;
  richTextValue?: RichTextContent;
  onChange?: (value: string) => void;
  onRichTextChange?: (content: RichTextContent) => void;
  onClear?: () => void;
  diffParts?: DiffPart[];
  sentences?: Sentence[];
  highlightedSentenceId?: string | null;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  scrollRef?: React.RefObject<HTMLDivElement | HTMLTextAreaElement>;
  className?: string;
  id?: string;
  onImportWord?: () => void;
  // Rich text content for direct HTML rendering in diff panel
  originalRichText?: RichTextContent;
  modifiedRichText?: RichTextContent;
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

export interface PlaybookEntry {
  id: string;
  text: string;
  approved: boolean;
  source: string;
  originalIndex?: number;
}

export interface PlaybookState {
  entries: PlaybookEntry[];
  approvedRules: PlaybookEntry[];
  pendingEntries: PlaybookEntry[];
}