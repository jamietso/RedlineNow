import * as Diff from 'diff';
import { DiffPart } from '../types';

/**
 * Compares two strings using a word-based diff algorithm ideal for legal text.
 * @param original The original text.
 * @param modified The modified text.
 * @returns An array of diff parts.
 */
export const computeDiff = (original: string, modified: string): DiffPart[] => {
  if (!original && !modified) return [];
  
  // Use diffWords for legal-style "Redline" (whole words, ignoring whitespace changes slightly)
  // or diffWordsWithSpace if exact spacing matters. 
  // Legal usually prefers diffWords to avoid cluttering with whitespace diffs.
  return Diff.diffWords(original, modified);
};

/**
 * Generates a plain text summary of the diff (stats).
 */
export const getDiffStats = (parts: DiffPart[]) => {
  let insertions = 0;
  let deletions = 0;

  parts.forEach(part => {
    if (part.added) insertions++;
    if (part.removed) deletions++;
  });

  return { insertions, deletions };
};

/**
 * Converts diff parts to a raw HTML string for clipboard copying.
 */
export const generateHtmlDiff = (parts: DiffPart[]): string => {
  return parts.map(part => {
    if (part.added) {
      return `<span style="color: blue; text-decoration: underline; text-decoration-skip-ink: none;">${part.value}</span>`;
    }
    if (part.removed) {
      return `<span style="color: red; text-decoration: line-through; text-decoration-skip-ink: none;">${part.value}</span>`;
    }
    return `<span>${part.value}</span>`;
  }).join('');
};