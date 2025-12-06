import { diff_match_patch } from 'diff-match-patch';
import * as Diff from 'diff';
import { DiffPart } from '../types';

export type DiffMode = 'char' | 'word';

/**
 * Compares two strings using either Google's diff-match-patch (char) or jsdiff (word).
 * @param original The original text.
 * @param modified The modified text.
 * @param mode The diff mode ('char' or 'word').
 * @returns An array of diff parts.
 */
export const computeDiff = (original: string, modified: string, mode: DiffMode = 'char'): DiffPart[] => {
  if (!original && !modified) return [];
  
  if (mode === 'word') {
    return Diff.diffWords(original, modified);
  }

  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, modified);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, text]) => {
    return {
      value: text,
      added: op === 1,
      removed: op === -1
    };
  });
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
  const htmlContent = parts.map(part => {
    // Escape HTML special characters to prevent injection/rendering issues
    const safeValue = part.value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, '<br/>'); // Explicitly convert newlines to <br> tags

    if (part.added) {
      return `<span style="color: blue; text-decoration: underline; text-decoration-skip-ink: none;">${safeValue}</span>`;
    }
    if (part.removed) {
      return `<span style="color: red; text-decoration: line-through; text-decoration-skip-ink: none;">${safeValue}</span>`;
    }
    return `<span>${safeValue}</span>`;
  }).join('');

  // Wrap in a container with default font styles to ensure it looks right in email
  return `<div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000000;">${htmlContent}</div>`;
};