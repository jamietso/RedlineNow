import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react';
import { RichTextContent } from '../types';

interface RichTextEditorProps {
  content: RichTextContent;
  onChange: (content: RichTextContent) => void;
  placeholder?: string;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Paste your text here...',
  onScroll,
  scrollRef,
  className = ''
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading, bullet list, etc. - keep it simple for legal docs
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline.configure({
        // Explicitly configure to avoid conflicts
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: typeof content === 'string' ? content : content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-6 font-serif text-lg leading-relaxed text-slate-800',
        style: 'u { text-decoration: underline; }',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (!editor) return;
    
    // Get current editor HTML for comparison
    const currentHtml = editor.getHTML();
    
    // Determine what the new content should be
    let newContent: string | any;
    if (typeof content === 'string') {
      // If content is a string (HTML), use it directly
      newContent = content;
    } else {
      // If content is JSONContent, use it directly
      newContent = content;
    }
    
    // Only update if content has actually changed
    // For HTML strings, compare the HTML directly
    // For JSON, we need to serialize and compare
    const contentChanged = typeof content === 'string' 
      ? content !== currentHtml
      : JSON.stringify(content) !== JSON.stringify(editor.getJSON());
    
    if (contentChanged) {
      // TipTap's setContent can handle HTML strings directly
      // It will parse the HTML and preserve formatting like <strong>, <em>, <u>
      editor.commands.setContent(newContent, false);
    }
  }, [content, editor]);

  // Handle scroll events on the wrapper div
  useEffect(() => {
    if (!wrapperRef.current || !onScroll) return;
    
    const handleScroll = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      // Create a synthetic event with the wrapper element as the target
      const syntheticEvent = {
        currentTarget: target,
        target: target
      } as React.UIEvent<HTMLElement>;
      onScroll(syntheticEvent);
    };
    
    const wrapper = wrapperRef.current;
    wrapper.addEventListener('scroll', handleScroll);
    
    return () => {
      wrapper.removeEventListener('scroll', handleScroll);
    };
  }, [onScroll]);

  // Set scroll ref to the actual scrollable container
  // Use a ref to track the wrapper div that actually scrolls
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef && wrapperRef.current) {
      // The scrollable element is the wrapper div with overflow-y-auto
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = wrapperRef.current;
    }
  }, [editor, scrollRef]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run();
  }, [editor]);

  if (!editor) {
    return <div className="p-6">Loading editor...</div>;
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center gap-2 shrink-0 h-[42px]">
        <button
          onClick={toggleBold}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('bold') ? 'bg-slate-300' : ''
          }`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={toggleItalic}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('italic') ? 'bg-slate-300' : ''
          }`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={toggleUnderline}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('underline') ? 'bg-slate-300' : ''
          }`}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </button>
      </div>

      {/* Editor Content */}
      <div ref={wrapperRef} className="flex-1 overflow-y-auto bg-white shadow-inner">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

