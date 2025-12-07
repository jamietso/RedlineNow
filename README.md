# LegalRedline

LegalRedline is a modern React application designed for comparing legal documents and text with precision. It features a powerful redline viewer and leverages AI to provide intelligent summaries of changes between document versions.

## Features

- **Side-by-Side Comparison**: View "Original" and "Modified" text in parallel editors.
- **Redline Visualization**: Clear visual highlighting of insertions (green) and deletions (red) in a dedicated Diff panel.
- **Synchronized Scrolling**: Keep all views in sync as you navigate through long documents.
- **AI-Powered Summaries**: Uses Google's Gemini 2.0 Flash model to analyze and summarize changes, helping you quickly understand the impact of edits.
- **Sentence-Level Analysis**: Intelligently segments text into sentences to provide granular context for changes.
- **Real-time Diffing**: Updates the redline view instantly as you type or paste text.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **AI**: Google Generative AI SDK (Gemini 2.0 Flash)
- **Diffing**: `diff-match-patch`, `diff`
- **UI/Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Google Gemini API Key (for AI summarization features)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd legalredline
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

### Running the App

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## Usage

1.  **Input Text**: Paste your original text in the left panel and the modified text in the middle panel.
2.  **View Redline**: The right panel will automatically show the redline difference.
3.  **Generate Summary**: Click the "Generate Summary" button (if available in the UI) to get an AI-generated explanation of the changes.
4.  **Sync Scrolling**: Toggle synchronized scrolling to navigate all panels simultaneously.

## License

[MIT](LICENSE)
