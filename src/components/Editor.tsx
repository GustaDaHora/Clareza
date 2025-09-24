import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import htm from 'html-to-md';
import { marked } from 'marked';

// Import DocumentMetadata type
import type { DocumentMetadata } from '../types';

interface TextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  metadata?: DocumentMetadata;
  isLoading?: boolean;
}

const TextEditor = ({ content, onContentChange, metadata, isLoading }: TextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: marked(content) as string,
    onUpdate: ({ editor }) => {
      onContentChange(htm(editor.getHTML()));
    },
    autofocus: 'end',
  });

  // Update editor content when the prop changes
  useEffect(() => {
    if (editor && htm(editor.getHTML()) !== content) {
      editor.commands.setContent(marked(content) as string);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white rounded-lg shadow-lg p-6 overflow-auto">
      {/* Toolbar simples */}
      <div className="flex space-x-2 border-b pb-2 mb-2">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded ${editor?.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-gray-900'}`}
        >
          B
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded ${editor?.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-gray-900'}`}
        >
          I
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-500 text-white' : 'bg-gray-900'}`}
        >
          H2
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded ${editor?.isActive('bulletList') ? 'bg-blue-500 text-white' : 'bg-gray-900'}`}
        >
          • List
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && <div className="text-blue-400 text-xs mb-2">Carregando...</div>}

      {/* Document stats if metadata is provided */}
      {metadata && (
        <div className="text-xs text-gray-400 mb-2 flex flex-wrap gap-4">
          {metadata.word_count !== undefined && <span>Palavras: {metadata.word_count}</span>}
          {metadata.character_count !== undefined && <span>Caracteres: {metadata.character_count}</span>}
          {metadata.modified_at && <span>Última modificação: {new Date(metadata.modified_at).toLocaleString()}</span>}
        </div>
      )}

      {/* Área do editor */}
      <EditorContent
        editor={editor}
        className="flex-1 prose prose-invert max-w-full focus:outline-none outline-none text-gray-100"
      />
    </div>
  );
};

export default TextEditor;
