import React, { useState, useRef } from 'react';
import { PlaybookEntry } from '../types';
import { parsePlaybook } from '../services/playbookService';
import { Upload, Check, X, Edit2, Save, FileText, Loader2 } from 'lucide-react';

interface PlaybookManagerProps {
  entries: PlaybookEntry[];
  onEntriesChange: (entries: PlaybookEntry[]) => void;
  onClose?: () => void;
}

export const PlaybookManager: React.FC<PlaybookManagerProps> = ({
  entries,
  onEntriesChange,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.docx')) {
      alert('Please select a Word document (.docx)');
      return;
    }

    setIsLoading(true);
    try {
      const newEntries = await parsePlaybook(file);
      onEntriesChange([...entries, ...newEntries]);
    } catch (error: any) {
      alert(`Error parsing playbook: ${error.message}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleApprove = (id: string) => {
    const updated = entries.map(entry =>
      entry.id === id ? { ...entry, approved: true } : entry
    );
    onEntriesChange(updated);
  };

  const handleReject = (id: string) => {
    const updated = entries.map(entry =>
      entry.id === id ? { ...entry, approved: false } : entry
    );
    onEntriesChange(updated);
  };

  const handleRemove = (id: string) => {
    const updated = entries.filter(entry => entry.id !== id);
    onEntriesChange(updated);
  };

  const handleStartEdit = (entry: PlaybookEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = entries.map(entry =>
      entry.id === editingId ? { ...entry, text: editText } : entry
    );
    onEntriesChange(updated);
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const approvedCount = entries.filter(e => e.approved).length;
  const pendingCount = entries.filter(e => !e.approved).length;

  return (
    <div className="w-96 h-full bg-white shadow-xl border-l border-slate-200 flex flex-col shrink-0 z-40">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50">
        <div className="flex items-center gap-2 text-indigo-700 font-bold">
          <FileText size={20} />
          <h2>Playbook Manager</h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Coming Soon Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-3">
            Coming Soon
          </span>
          <p className="text-sm text-slate-600">
            Upload your contract playbook to automatically generate suggested edits based on your negotiation guidelines.
          </p>
        </div>
      </div>

      <div className="p-4 border-b border-slate-200 bg-slate-50 opacity-50 pointer-events-none">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={handleUploadClick}
          disabled={true}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload size={16} />
          <span>Upload Playbook</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-medium text-slate-600">Playbook-Driven Editing</p>
            <p className="text-sm mt-2 text-slate-500 max-w-xs mx-auto">
              Soon you'll be able to upload your negotiation playbook and get AI-suggested edits applied to your contracts automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`border rounded-lg p-3 ${
                  entry.approved
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    {editingId === entry.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded text-sm resize-none"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-slate-700">{entry.text}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{entry.source}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {editingId === entry.id ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        <Save size={12} />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {!entry.approved ? (
                        <button
                          onClick={() => handleApprove(entry.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          <Check size={12} />
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReject(entry.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          <X size={12} />
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(entry)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors ml-auto"
                      >
                        <X size={12} />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



