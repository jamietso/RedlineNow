import { GoogleGenerativeAI } from '@google/generative-ai';
import { DiffPart, Sentence, SummaryResult } from '../types';

// Initialize Gemini API
// Note: In a real production app, you might want to proxy this through a backend to hide the key,
// but for this local/demo app, using the env var directly is fine.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Segments a list of DiffParts into Sentences.
 * Handles splitting DiffParts that cross sentence boundaries.
 */
export const segmentDiffIntoSentences = (diffParts: DiffPart[]): Sentence[] => {
  const sentences: Sentence[] = [];
  let currentParts: DiffPart[] = [];
  let currentId = 0;

  // Regex to find sentence endings. 
  // Matches . ! ? followed by whitespace or end of string.
  // We capture the whitespace to include it in the sentence so it doesn't bleed into the next one.
  const sentenceEndRegex = /([.!?]+)(\s+|$)/g;

  for (const part of diffParts) {
    let remainingValue = part.value;
    let match;

    // We need to loop because a single part might contain multiple sentences
    while ((match = sentenceEndRegex.exec(remainingValue)) !== null) {
      const endIdx = match.index + match[0].length;
      const segment = remainingValue.substring(0, endIdx);
      
      // Add this segment to current sentence
      if (segment) {
        currentParts.push({ ...part, value: segment });
      }

      // Finish the current sentence
      if (currentParts.length > 0) {
        sentences.push(createSentence(currentId++, currentParts));
        currentParts = [];
      }

      // Update remaining
      remainingValue = remainingValue.substring(endIdx);
      // Reset regex index because we sliced the string
      sentenceEndRegex.lastIndex = 0;
    }

    // If there's anything left, it belongs to the next sentence (or the current one if we didn't finish one)
    if (remainingValue) {
      currentParts.push({ ...part, value: remainingValue });
    }
  }

  // Add any remaining parts as the final sentence
  if (currentParts.length > 0) {
    sentences.push(createSentence(currentId++, currentParts));
  }

  return sentences;
};

const createSentence = (id: number, parts: DiffPart[]): Sentence => {
  // Only mark as edited if there are non-whitespace changes
  const hasEdits = parts.some(p => (p.added || p.removed) && p.value.trim().length > 0);
  
  const rawText = parts.map(p => {
    if (p.added) return `[ADDED: ${p.value}]`;
    if (p.removed) return `[REMOVED: ${p.value}]`;
    return p.value;
  }).join('');

  return {
    id: `sentence-${id}`,
    parts,
    hasEdits,
    rawText
  };
};

/**
 * Generates a summary for the edited sentences using Gemini.
 */
export const generateRedlineSummary = async (sentences: Sentence[]): Promise<SummaryResult> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in .env.local");
  }

  const editedSentences = sentences.filter(s => s.hasEdits);

  if (editedSentences.length === 0) {
    return { items: [], highLevelSummary: "No changes detected." };
  }

  // We'll batch the request to avoid too many API calls.
  // We'll send all edited sentences with their IDs and ask for a JSON response.
  
  const prompt = `
    You are a legal expert assistant. Analyze the following list of sentences from a legal document redline.
    Each sentence has an ID and text where additions are marked with [ADDED: ...] and deletions with [REMOVED: ...].

    For each sentence:
    1. Generate a concise, plain-English description of what changed (e.g., "Changed payment terms from 30 to 45 days").
    
    Then, generate a single "highLevelSummary" paragraph that summarizes the overall impact of these changes.

    Return the result as a JSON object with this structure:
    {
      "items": [
        { "sentenceId": "...", "description": "..." }
      ],
      "highLevelSummary": "..."
    }

    Here are the sentences:
    ${JSON.stringify(editedSentences.map(s => ({ id: s.id, text: s.rawText })))}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonStr) as SummaryResult;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary. Please try again.");
  }
};
