import { importWordDocument } from './wordService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PlaybookEntry } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Parse a Word playbook document and extract individual rules/guidelines
 */
export const parsePlaybook = async (file: File): Promise<PlaybookEntry[]> => {
  try {
    // Import Word document
    const result = await importWordDocument(file);
    const playbookText = result.text;

    if (!API_KEY) {
      throw new Error("Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in .env.local");
    }

    // Use AI to extract discrete rules from freeform text
    const prompt = `
You are analyzing a legal playbook document. Extract individual rules, guidelines, or instructions from the following text.
Each rule should be a discrete, actionable guideline that can be applied to document review.

Return the result as a JSON array of objects with this structure:
[
  { "text": "Rule or guideline text here", "category": "optional category if apparent" },
  ...
]

Extract rules that are:
- Specific and actionable
- Clear guidelines for document review
- Distinct from each other (don't duplicate similar rules)

Here is the playbook text:
${playbookText}
`;

    try {
      const aiResult = await model.generateContent(prompt);
      const response = aiResult.response;
      let text = response.text();
      
      // Clean up markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Try to extract JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      
      const parsed = JSON.parse(jsonStr) as Array<{ text: string; category?: string }>;
      
      // Convert to PlaybookEntry format
      return parsed.map((item, index) => ({
        id: `playbook-entry-${Date.now()}-${index}`,
        text: item.text,
        approved: false,
        source: file.name,
        originalIndex: index
      }));
    } catch (error) {
      console.error("Error parsing playbook with AI:", error);
      // Fallback: split by paragraphs and create entries
      const paragraphs = playbookText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      return paragraphs.map((para, index) => ({
        id: `playbook-entry-${Date.now()}-${index}`,
        text: para.trim(),
        approved: false,
        source: file.name,
        originalIndex: index
      }));
    }
  } catch (error) {
    console.error('Error parsing playbook:', error);
    throw new Error('Failed to parse playbook. Please ensure it is a valid Word document.');
  }
};

/**
 * Filter playbook entries to get only approved ones
 */
export const getApprovedRules = (entries: PlaybookEntry[]): PlaybookEntry[] => {
  return entries.filter(entry => entry.approved);
};

/**
 * Filter playbook entries to get pending (unapproved) ones
 */
export const getPendingEntries = (entries: PlaybookEntry[]): PlaybookEntry[] => {
  return entries.filter(entry => !entry.approved);
};








