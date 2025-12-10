import React, { useRef, useState, useEffect } from 'react';
import { X, Upload, FileText, Copy } from 'lucide-react';
import { importWordDocument } from '../services/wordService';
import { RichTextContent } from '../types';

interface ImportModifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string, richText?: RichTextContent) => void;
  originalText: string;
  originalRichText?: RichTextContent;
}

export const ImportModifiedModal: React.FC<ImportModifiedModalProps> = ({
  isOpen,
  onClose,
  onImport,
  originalText,
  originalRichText
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedOption, setSelectedOption] = useState<'copy' | 'import' | 'paste' | null>(null);

  // Reset selected option when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedOption(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyOriginal = () => {
    onImport(originalText, originalRichText);
    onClose();
  };

  const handleImportClick = () => {
    setSelectedOption('import');
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      try {
        const result = await importWordDocument(file);
        onImport(result.text, result.html);
        onClose();
      } catch (error: any) {
        alert(`Error importing Word document: ${error.message}`);
      }
    } else {
      // Plain text file
      const text = await file.text();
      onImport(text);
      onClose();
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePasteClick = () => {
    setSelectedOption('paste');
    // Focus textarea after a brief delay to ensure it's rendered
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.trim().length > 0) {
      onImport(text);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Start Modifications</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-indigo-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-slate-600 mb-6">
            You've uploaded an original document. Choose how you want to begin your modified version.
          </p>
          
          <div className="space-y-4">
            {/* Three Option Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Copy Original */}
              <button
                onClick={handleCopyOriginal}
                className="flex flex-col items-center justify-center p-6 border-2 border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
              >
                <Copy className="mb-3 text-slate-600 group-hover:text-indigo-600" size={32} />
                <span className="font-semibold text-slate-700 group-hover:text-indigo-700 mb-2">
                  Copy Original
                </span>
                <p className="text-sm text-slate-500 text-center">
                  Duplicate the original document and start editing.
                </p>
              </button>

              {/* Import File */}
              <button
                onClick={handleImportClick}
                className="flex flex-col items-center justify-center p-6 border-2 border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="mb-3 text-slate-600 group-hover:text-indigo-600" size={32} />
                <span className="font-semibold text-slate-700 group-hover:text-indigo-700 mb-2">
                  Import File
                </span>
                <p className="text-sm text-slate-500 text-center">
                  Upload a modified .docx or .txt file.
                </p>
              </button>

              {/* Paste Text */}
              <button
                onClick={handlePasteClick}
                className="flex flex-col items-center justify-center p-6 border-2 border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
              >
                <FileText className="mb-3 text-slate-600 group-hover:text-indigo-600" size={32} />
                <span className="font-semibold text-slate-700 group-hover:text-indigo-700 mb-2">
                  Paste Text
                </span>
                <p className="text-sm text-slate-500 text-center">
                  Paste modified text directly.
                </p>
              </button>
            </div>

            {/* Paste Textarea - Only shown when Paste Text is selected */}
            {selectedOption === 'paste' && (
              <div className="border border-slate-300 rounded-lg transition-all duration-200">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-300 flex items-center gap-2">
                  <FileText size={16} className="text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Paste Modified Text</span>
                </div>
                <textarea
                  ref={textareaRef}
                  onChange={handleTextareaChange}
                  placeholder="Paste your modified text here..."
                  className="w-full p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif text-base leading-relaxed min-h-[200px]"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};






