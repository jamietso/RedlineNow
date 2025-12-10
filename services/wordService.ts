import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, DeletedTextRun, InsertedTextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { DiffPart, RichTextFormatting } from '../types';

export interface WordImportResult {
  text: string;
  html: string;
  formatting?: RichTextFormatting[];
}

/**
 * Normalize HTML from mammoth to ensure compatibility with TipTap
 * - Ensures proper tag structure
 * - Normalizes formatting tags (b/strong, i/em, u)
 * - Removes problematic attributes or elements
 */
const normalizeHtmlForTipTap = (html: string): string => {
  if (typeof document === 'undefined') {
    // Server-side: simple regex normalization
    return html
      .replace(/<b\b/gi, '<strong>')
      .replace(/<\/b>/gi, '</strong>')
      .replace(/<i\b/gi, '<em>')
      .replace(/<\/i>/gi, '</em>');
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Normalize formatting tags
    // Convert <b> to <strong> and <i> to <em> for consistency
    const boldElements = doc.querySelectorAll('b');
    boldElements.forEach(el => {
      const strong = doc.createElement('strong');
      strong.innerHTML = el.innerHTML;
      el.parentNode?.replaceChild(strong, el);
    });
    
    const italicElements = doc.querySelectorAll('i');
    italicElements.forEach(el => {
      const em = doc.createElement('em');
      em.innerHTML = el.innerHTML;
      el.parentNode?.replaceChild(em, el);
    });
    
    // Get the normalized HTML from body
    return doc.body.innerHTML;
  } catch (error) {
    console.warn('Error normalizing HTML, using original:', error);
    // Fallback: simple regex normalization
    return html
      .replace(/<b\b/gi, '<strong>')
      .replace(/<\/b>/gi, '</strong>')
      .replace(/<i\b/gi, '<em>')
      .replace(/<\/i>/gi, '</em>');
  }
};

/**
 * Import a Word document (.docx) and extract text and formatting
 */
export const importWordDocument = async (file: File): Promise<WordImportResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract HTML with formatting
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    let html = htmlResult.value;
    
    // Normalize HTML for TipTap compatibility
    html = normalizeHtmlForTipTap(html);
    
    // Extract plain text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const text = textResult.value;
    
    // Parse formatting from HTML
    const formatting = parseFormattingFromHtml(html);
    
    return {
      text,
      html,
      formatting
    };
  } catch (error) {
    console.error('Error importing Word document:', error);
    throw new Error('Failed to import Word document. Please ensure it is a valid .docx file.');
  }
};

/**
 * Parse formatting information from HTML
 */
const parseFormattingFromHtml = (html: string): RichTextFormatting[] => {
  const formatting: RichTextFormatting[] = [];
  
  // Only parse if we're in a browser environment
  if (typeof document === 'undefined') {
    return formatting;
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Walk through text nodes and extract formatting
    const walker = doc.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        let parent = node.parentElement;
        const format: RichTextFormatting = {};
        
        while (parent && parent !== doc.body) {
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'strong' || tagName === 'b') format.bold = true;
          if (tagName === 'em' || tagName === 'i') format.italic = true;
          if (tagName === 'u') format.underline = true;
          parent = parent.parentElement;
        }
        
        if (Object.keys(format).length > 0) {
          formatting.push(format);
        }
      }
    }
  } catch (error) {
    console.warn('Error parsing formatting from HTML:', error);
  }
  
  return formatting;
};

/**
 * Export redline comparison to Word document with proper track changes
 */
export const exportWordDocument = async (
  diffParts: DiffPart[],
  filename: string = 'redline-comparison.docx'
): Promise<void> => {
  try {
    const children: Paragraph[] = [];
    
    // Add title
    children.push(
      new Paragraph({
        text: 'Redline Comparison',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
    
    // Process diff parts
    let currentParagraph: (TextRun | DeletedTextRun | InsertedTextRun)[] = [];
    let revisionId = 0;
    const author = 'RedlineNow';
    const date = new Date().toISOString();
    
    for (const part of diffParts) {
      const text = part.value;
      
      // Split by newlines to handle paragraph breaks
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        // Build run options with formatting
        const runOptions: any = {
          text: line,
        };
        
        // Apply formatting from diff part
        if (part.formatting) {
          if (part.formatting.bold) runOptions.bold = true;
          if (part.formatting.italic) runOptions.italics = true;
          if (part.formatting.underline) runOptions.underline = {};
        }
        
        // Use proper track changes instead of manual formatting
        if (part.removed) {
          // Use DeletedTextRun for actual Word track changes (deletions)
          currentParagraph.push(
            new DeletedTextRun({
              ...runOptions,
              id: revisionId++,
              author: author,
              date: date
            })
          );
        } else if (part.added) {
          // Use InsertedTextRun for actual Word track changes (insertions)
          currentParagraph.push(
            new InsertedTextRun({
              ...runOptions,
              id: revisionId++,
              author: author,
              date: date
            })
          );
        } else {
          // Regular unchanged text
          currentParagraph.push(new TextRun(runOptions));
        }
        
        // Add paragraph break except for last line
        if (i < lines.length - 1) {
          if (currentParagraph.length > 0) {
            children.push(new Paragraph({ children: currentParagraph }));
            currentParagraph = [];
          } else {
            children.push(new Paragraph({ text: '' }));
          }
        }
      }
    }
    
    // Add final paragraph if there are remaining runs
    if (currentParagraph.length > 0) {
      children.push(new Paragraph({ children: currentParagraph }));
    }
    
    // Create document with track revisions enabled
    const doc = new Document({
      features: {
        trackRevisions: true
      },
      sections: [
        {
          properties: {},
          children: children.length > 0 ? children : [
            new Paragraph({
              text: 'No changes to display.',
              alignment: AlignmentType.CENTER
            })
          ]
        }
      ]
    });
    
    // Generate and download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting Word document:', error);
    throw new Error('Failed to export Word document.');
  }
};

