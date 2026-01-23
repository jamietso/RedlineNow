# CLAUDE.md

This file provides guidance for Claude Code when working with this repository.

## Project Overview

LegalRedline (RedlineNow) is a React application for comparing legal documents with precision. It provides side-by-side text comparison, redline visualization, and AI-powered summaries of document changes using Google's Gemini API.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **AI**: Google Generative AI SDK (`@google/generative-ai`) with Gemini 2.5 Flash model
- **Diffing**: `diff-match-patch` (character-level), `diff` (word-level)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS (via inline classes)

## Project Structure

```
/
├── App.tsx              # Main application component with state management
├── index.tsx            # React entry point
├── index.html           # HTML template with Tailwind CDN
├── types.ts             # TypeScript interfaces (DiffPart, Sentence, SummaryResult, etc.)
├── constants.ts         # Initial sample text for demo purposes
├── components/
│   ├── Header.tsx       # Top navigation bar with actions
│   ├── EditorPanel.tsx  # Text input panels (Original/Modified)
│   ├── DiffPanel.tsx    # Redline comparison view
│   └── SummaryPanel.tsx # AI-generated summary sidebar
├── services/
│   ├── aiService.ts     # Gemini API integration, sentence segmentation
│   └── diffService.ts   # Diff computation and HTML generation
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run preview  # Preview production build
```

## Environment Setup

Create a `.env` file in the root directory with:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

The Gemini API key is required for the AI Summary feature. Without it, the app will still work for diffing but AI summaries will fail.

## Key Architecture Concepts

### Diff Modes
- **Character mode** (`'char'`): Uses `diff-match-patch` for precise character-level comparison
- **Word mode** (`'word'`): Uses `jsdiff` for more readable word-level comparison

### Data Flow
1. User enters text in Original and Modified panels
2. `computeDiff()` generates `DiffPart[]` array
3. `segmentDiffIntoSentences()` groups diff parts into sentences for AI analysis
4. `DiffPanel` renders the redline view with insertions (blue/underlined) and deletions (red/strikethrough)
5. Optional: AI Summary generates plain-English descriptions via Gemini

### Key Types
- `DiffPart`: `{ value: string, added?: boolean, removed?: boolean }`
- `Sentence`: Contains parts, hasEdits flag, and rawText for AI processing
- `SummaryResult`: AI response with per-sentence descriptions and high-level summary

### Synchronized Scrolling
The app maintains scroll synchronization across all three panels using percentage-based scroll position calculation. This is managed via refs and a `ScrollSource` enum to prevent circular updates.

## Code Style Guidelines

- Use functional components with hooks
- Type all props and state with TypeScript interfaces
- Keep components focused - extract reusable logic to services
- Use Tailwind CSS classes for styling (no separate CSS files)
- Handle errors gracefully with user-friendly messages

## Testing Notes

No test framework is currently configured. When adding tests, consider:
- Unit tests for `diffService.ts` functions
- Integration tests for AI service (mock the Gemini API)
- Component tests for user interactions
