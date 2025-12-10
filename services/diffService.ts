import { diff_match_patch } from 'diff-match-patch';
import * as Diff from 'diff';
import { DiffPart, RichTextContent, RichTextFormatting } from '../types';

export type DiffMode = 'char' | 'word';

/**
 * Formatting information for a text range
 */
interface FormattingRange {
  start: number;
  end: number;
  formatting: RichTextFormatting;
}

/**
 * Unified extraction result containing both plain text and formatting ranges
 */
interface ExtractionResult {
  plainText: string;
  formattingRanges: FormattingRange[];
}

/**
 * Extract plain text from rich text content (HTML or JSON)
 * For HTML, uses a simple approach that matches the unified extraction
 */
const extractPlainText = (content: RichTextContent | string): string => {
  if (typeof content === 'string') {
    // If it's HTML, we'll use the unified extraction function
    if (content.includes('<')) {
      if (typeof document !== 'undefined') {
        const result = extractTextAndFormattingFromHtml(content);
        return result.plainText;
      }
      // Fallback: simple regex to strip HTML tags
      return content.replace(/<[^>]*>/g, '');
    }
    return content;
  }
  // If it's JSON (Tiptap format), extract text recursively
  const extractTextFromJSON = (node: any): string => {
    if (typeof node === 'string') return node;
    if (node.text) return node.text;
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractTextFromJSON).join('');
    }
    return '';
  };
  return extractTextFromJSON(content);
};

/**
 * Unified function that extracts both plain text and formatting ranges from HTML
 * in a single pass, ensuring character offsets align perfectly.
 * This is the key fix - both text and formatting use the same character-by-character walk.
 */
const extractTextAndFormattingFromHtml = (html: string): ExtractionResult => {
  const result: ExtractionResult = {
    plainText: '',
    formattingRanges: []
  };
  
  if (typeof document === 'undefined' || !html.includes('<')) {
    return result;
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Walk through the DOM and extract both text and formatting in the same pass
    const walkNode = (node: Node, textOffset: number, inheritedFormatting: RichTextFormatting = {}): number => {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent || '';
        
        // Skip whitespace-only text nodes that are direct children of body (between block elements)
        // This prevents double newlines from whitespace between <p> tags
        if (node.parentNode === doc.body && /^\s*$/.test(text)) {
          return textOffset;
        }
        
        // Normalize whitespace within inline content (like browsers do):
        // - Replace newlines and tabs with spaces
        // - Collapse multiple spaces into one
        // This prevents extra line breaks from appearing in the middle of paragraphs
        if (node.parentNode !== doc.body) {
          text = text.replace(/[\r\n\t]+/g, ' ');
        }
        
        const textLength = text.length;
        
        // Add text to plain text result
        result.plainText += text;
        
        // If we have inherited formatting, record it for this text node
        if (Object.keys(inheritedFormatting).length > 0 && textLength > 0) {
          result.formattingRanges.push({
            start: textOffset,
            end: textOffset + textLength,
            formatting: { ...inheritedFormatting }
          });
        }
        
        return textOffset + textLength;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // Handle block elements that should add newlines
        if (tagName === 'p' || tagName === 'div') {
          // Add newline before block element content (except at start)
          if (textOffset > 0 && result.plainText.length > 0 && !result.plainText.endsWith('\n')) {
            result.plainText += '\n';
            textOffset += 1;
          }
        } else if (tagName === 'br') {
          // Add newline for <br> tags
          result.plainText += '\n';
          return textOffset + 1;
        }
        
        // Build formatting from this element and inherited formatting
        const currentFormatting: RichTextFormatting = { ...inheritedFormatting };
        if (tagName === 'strong' || tagName === 'b') currentFormatting.bold = true;
        if (tagName === 'em' || tagName === 'i') currentFormatting.italic = true;
        if (tagName === 'u') currentFormatting.underline = true;
        
        // Process children with inherited formatting
        let currentOffset = textOffset;
        for (const child of Array.from(node.childNodes)) {
          currentOffset = walkNode(child, currentOffset, currentFormatting);
        }
        
        // Add newline after block elements (except if already added)
        if ((tagName === 'p' || tagName === 'div') && !result.plainText.endsWith('\n')) {
          result.plainText += '\n';
          currentOffset += 1;
        }
        
        return currentOffset;
      }
      
      // For other node types, just process children with inherited formatting
      let currentOffset = textOffset;
      for (const child of Array.from(node.childNodes)) {
        currentOffset = walkNode(child, currentOffset, inheritedFormatting);
      }
      return currentOffset;
    };
    
    walkNode(doc.body, 0, {});
    
    // Trim trailing newlines from plain text
    result.plainText = result.plainText.replace(/\n+$/, '');
    
    // Debug logging
    if (result.formattingRanges.length > 0) {
      console.log(`[Formatting] Extracted ${result.formattingRanges.length} formatting ranges from HTML`);
      console.log(`[Formatting] Plain text length: ${result.plainText.length}`);
      console.log(`[Formatting] Sample ranges:`, result.formattingRanges.slice(0, 3));
    }
  } catch (error) {
    console.warn('Error extracting text and formatting from HTML:', error);
  }
  
  return result;
};

/**
 * Extract formatting information from HTML and map it to character positions
 * Now uses the unified extraction function to ensure offsets align
 * Note: This function is kept for backward compatibility but should use extractTextAndFormattingFromHtml directly
 */
const extractFormattingRanges = (html: string, plainText: string): FormattingRange[] => {
  if (typeof document === 'undefined' || !html.includes('<')) {
    return [];
  }
  
  // Use unified extraction - this ensures offsets match exactly
  const result = extractTextAndFormattingFromHtml(html);
  
  // Verify the plain text matches (for debugging) - but don't fail if it doesn't
  // The caller should use unified extraction directly to avoid this issue
  if (result.plainText !== plainText) {
    console.warn('[Formatting] Plain text mismatch! This indicates an offset alignment issue.');
    console.warn('[Formatting] Expected length:', plainText.length, 'Got length:', result.plainText.length);
    console.warn('[Formatting] Consider using extractTextAndFormattingFromHtml directly for both text and formatting.');
  }
  
  return result.formattingRanges;
};

/**
 * Get formatting for a specific text range.
 * Returns formatting only if the range is fully contained within formatting ranges.
 * Since we split parts at formatting boundaries, this check is straightforward.
 */
const getFormattingForRange = (ranges: FormattingRange[], start: number, end: number): RichTextFormatting | undefined => {
  if (ranges.length === 0 || end <= start) return undefined;
  
  // Find ranges that fully contain this range
  const containingRanges = ranges.filter(range => 
    range.start <= start && range.end >= end
  );
  
  if (containingRanges.length === 0) return undefined;
  
  // Merge formatting from all containing ranges
  const merged: RichTextFormatting = {};
  containingRanges.forEach(range => {
    if (range.formatting.bold) merged.bold = true;
    if (range.formatting.italic) merged.italic = true;
    if (range.formatting.underline) merged.underline = true;
  });
  
  return Object.keys(merged).length > 0 ? merged : undefined;
};

/**
 * Split a diff part at formatting boundaries so each sub-part has consistent formatting.
 * This ensures formatting is applied correctly to exactly the text that has it.
 */
const splitPartAtFormattingBoundaries = (
  part: DiffPart,
  ranges: FormattingRange[],
  partStart: number,
  partEnd: number
): DiffPart[] => {
  // If no formatting ranges, return the part as-is
  if (ranges.length === 0) {
    return [part];
  }
  
  // Find all boundary points (starts and ends of formatting ranges) within this part
  const boundaries = new Set<number>();
  boundaries.add(partStart);
  boundaries.add(partEnd);
  
  for (const range of ranges) {
    // Add range start if it's within our part
    if (range.start > partStart && range.start < partEnd) {
      boundaries.add(range.start);
    }
    // Add range end if it's within our part
    if (range.end > partStart && range.end < partEnd) {
      boundaries.add(range.end);
    }
  }
  
  // If no boundaries were added (just start and end), no splitting needed
  if (boundaries.size <= 2) {
    // Check if the whole part has formatting
    const formatting = getFormattingForRange(ranges, partStart, partEnd);
    return [{
      ...part,
      formatting
    }];
  }
  
  // Sort boundaries and create sub-parts
  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const result: DiffPart[] = [];
  
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];
    const textStart = start - partStart;
    const textEnd = end - partStart;
    const subText = part.value.substring(textStart, textEnd);
    
    if (subText.length === 0) continue;
    
    // Get formatting for this exact range (will be 100% coverage since we split at boundaries)
    const formatting = getFormattingForRange(ranges, start, end);
    
    result.push({
      value: subText,
      added: part.added,
      removed: part.removed,
      changeId: part.changeId,
      formatting
    });
  }
  
  return result.length > 0 ? result : [part];
};

/**
 * Compares two strings or rich text contents using either Google's diff-match-patch (char) or jsdiff (word).
 * Extracts plain text for diffing but preserves formatting metadata.
 * @param original The original text or rich text content.
 * @param modified The modified text or rich text content.
 * @param mode The diff mode ('char' or 'word').
 * @returns An array of diff parts.
 */
export const computeDiff = (
  original: string | RichTextContent,
  modified: string | RichTextContent,
  mode: DiffMode = 'char'
): DiffPart[] => {
  // Use unified extraction for HTML content to ensure offsets align perfectly
  // For HTML strings, extract both text and formatting in one pass
  // For non-HTML strings or JSON content, extract separately
  let originalText: string;
  let originalFormattingRanges: FormattingRange[] = [];
  let modifiedText: string;
  let modifiedFormattingRanges: FormattingRange[] = [];
  
  // Process original content
  if (typeof original === 'string' && original.includes('<') && typeof document !== 'undefined') {
    // HTML string - use unified extraction to ensure offsets align
    const originalResult = extractTextAndFormattingFromHtml(original);
    originalText = originalResult.plainText;
    originalFormattingRanges = originalResult.formattingRanges;
  } else {
    // Plain string or JSON content - no formatting to extract
    originalText = typeof original === 'string' ? original : extractPlainText(original);
    originalFormattingRanges = [];
  }
  
  // Process modified content
  if (typeof modified === 'string' && modified.includes('<') && typeof document !== 'undefined') {
    // HTML string - use unified extraction to ensure offsets align
    const modifiedResult = extractTextAndFormattingFromHtml(modified);
    modifiedText = modifiedResult.plainText;
    modifiedFormattingRanges = modifiedResult.formattingRanges;
  } else {
    // Plain string or JSON content - no formatting to extract
    modifiedText = typeof modified === 'string' ? modified : extractPlainText(modified);
    modifiedFormattingRanges = [];
  }
  
  // Debug: log formatting range extraction
  if (originalFormattingRanges.length > 0) {
    console.log(`[Formatting] Original: ${originalFormattingRanges.length} formatting ranges, text length: ${originalText.length}`);
  }
  if (modifiedFormattingRanges.length > 0) {
    console.log(`[Formatting] Modified: ${modifiedFormattingRanges.length} formatting ranges, text length: ${modifiedText.length}`);
  }
  
  if (!originalText && !modifiedText) return [];
  
  let parts: DiffPart[];
  
  if (mode === 'word') {
    parts = Diff.diffWords(originalText, modifiedText);
  } else {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(originalText, modifiedText);
    dmp.diff_cleanupSemantic(diffs);

    parts = diffs.map(([op, text]) => {
      return {
        value: text,
        added: op === 1,
        removed: op === -1
      };
    });
  }

  // Split diff parts at formatting boundaries and assign correct formatting
  // Track offsets separately for original and modified text
  let originalOffset = 0;
  let modifiedOffset = 0;
  let changeCounter = 0;
  
  const splitParts: DiffPart[] = [];
  
  for (const part of parts) {
    // Add change ID for added/removed parts
    const partWithId: DiffPart = { ...part };
    if (part.added || part.removed) {
      partWithId.changeId = `change-${changeCounter++}-${part.added ? 'add' : 'remove'}`;
    }
    
    if (part.added) {
      // For added text, use formatting from modified document
      const start = modifiedOffset;
      const end = modifiedOffset + part.value.length;
      const subParts = splitPartAtFormattingBoundaries(partWithId, modifiedFormattingRanges, start, end);
      splitParts.push(...subParts);
      modifiedOffset = end;
      // Don't advance originalOffset for added text
    } else if (part.removed) {
      // For removed text, use formatting from original document
      const start = originalOffset;
      const end = originalOffset + part.value.length;
      const subParts = splitPartAtFormattingBoundaries(partWithId, originalFormattingRanges, start, end);
      splitParts.push(...subParts);
      originalOffset = end;
      // Don't advance modifiedOffset for removed text
    } else {
      // For unchanged text, prefer formatting from modified (matches what user sees in editor)
      const start = modifiedOffset;
      const end = modifiedOffset + part.value.length;
      const subParts = splitPartAtFormattingBoundaries(partWithId, modifiedFormattingRanges, start, end);
      splitParts.push(...subParts);
      // Advance both offsets for unchanged text
      originalOffset += part.value.length;
      modifiedOffset = end;
    }
  }
  
  // Debug: log formatting summary
  const formattedCount = splitParts.filter(p => p.formatting).length;
  if (formattedCount > 0) {
    console.log(`[Formatting] Applied formatting to ${formattedCount} out of ${splitParts.length} split diff parts`);
  }
  
  return splitParts;
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
 * Generates HTML with diff markers (ins/del tags) that preserves paragraph structure.
 * This is used for direct HTML rendering in the diff panel.
 */
export const generateMarkedHtml = (
  originalHtml: string | null,
  modifiedHtml: string | null,
  diffParts: DiffPart[]
): string => {
  if (!diffParts || diffParts.length === 0) {
    return modifiedHtml || originalHtml || '';
  }

  // Build HTML from diff parts, using <p> tags for paragraphs
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      paragraphs.push(`<p>${currentParagraph.join('')}</p>`);
      currentParagraph = [];
    }
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const wrapWithFormatting = (text: string, formatting?: RichTextFormatting): string => {
    let result = escapeHtml(text);
    if (formatting) {
      if (formatting.underline) result = `<u>${result}</u>`;
      if (formatting.italic) result = `<em>${result}</em>`;
      if (formatting.bold) result = `<strong>${result}</strong>`;
    }
    return result;
  };

  for (const part of diffParts) {
    // Split the part by newlines to handle paragraph breaks
    const segments = part.value.split('\n');
    
    segments.forEach((segment, segmentIndex) => {
      // If not the first segment, the previous newline means end of paragraph
      if (segmentIndex > 0) {
        flushParagraph();
      }
      
      // Skip empty segments (but we still needed to flush the paragraph above)
      if (!segment) return;
      
      // Apply formatting and diff markers
      let html = wrapWithFormatting(segment, part.formatting);
      
      if (part.added) {
        html = `<ins>${html}</ins>`;
      } else if (part.removed) {
        html = `<del>${html}</del>`;
      }
      
      currentParagraph.push(html);
    });
  }

  // Flush any remaining content
  flushParagraph();

  // If no paragraphs were created, return empty content indicator
  if (paragraphs.length === 0) {
    return '<p><em>No content</em></p>';
  }

  return paragraphs.join('');
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