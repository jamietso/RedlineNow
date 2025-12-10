import React, { useRef } from 'react';
import { PanelProps } from '../types';
import { Trash2, Upload } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { importWordDocument } from '../services/wordService';

export const EditorPanel: React.FC<PanelProps> = ({ 
  title, 
  value = '', 
  richTextValue,
  onChange, 
  onRichTextChange,
  onClear,
  onScroll, 
  scrollRef,
  className = "",
  onImportWord
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      try {
        const result = await importWordDocument(file);
        // When rich text is available, set both rich text and plain text
        if (onRichTextChange) {
          onRichTextChange(result.html);
          // Also update plain text if onChange is provided
          if (onChange) {
            onChange(result.text);
          }
        } else if (onChange) {
          // Fallback to plain text only if no rich text handler
          onChange(result.text);
        }
      } catch (error: any) {
        alert(`Error importing Word document: ${error.message}`);
      }
    } else {
      // Plain text file
      const text = await file.text();
      if (onChange) {
        onChange(text);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    if (onImportWord) {
      onImportWord();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="bg-slate-200 border-b border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between items-center shrink-0 h-[42px]">
        <span>{title}</span>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
            title="Import Word document"
          >
            <Upload size={14} />
            <span className="hidden xl:inline">Import</span>
          </button>
          {onClear && value && value.length > 0 && (
            <button 
              onClick={onClear}
              className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
              title="Clear text"
            >
              <Trash2 size={14} />
              <span className="hidden xl:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      {onRichTextChange || richTextValue ? (
        <RichTextEditor
          content={richTextValue || ''}
          onChange={(content) => {
            if (onRichTextChange) {
              onRichTextChange(content);
            } else if (onChange && typeof content === 'string') {
              // Extract plain text from HTML
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content;
              onChange(tempDiv.textContent || '');
            }
          }}
          onScroll={onScroll}
          scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          placeholder="Paste your text here..."
        />
      ) : (
        <textarea
          ref={scrollRef as React.RefObject<HTMLTextAreaElement>}
          className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white font-serif text-lg leading-relaxed text-slate-800 shadow-inner overflow-y-auto"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onScroll={onScroll}
          placeholder="Paste your text here..."
          spellCheck={false}
        />
      )}
    </div>
  );
};
