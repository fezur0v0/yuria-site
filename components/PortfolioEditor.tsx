'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, type ReactNode, type ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PortfolioEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function PortfolioEditor({ content, onChange }: PortfolioEditorProps) {
  const supabase = createClient();

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageResize.configure({
        HTMLAttributes: { class: 'rounded-xl' },
        minWidth: 80,
        maxWidth: 800,
      }),
      Placeholder.configure({ placeholder: '开始写点什么…' }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none focus:outline-none',
      },
    },
  });

  const insertImage = useCallback(async (file: File) => {
    if (!editor) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage
      .from('theater-images')
      .upload(fileName, file);
    if (error) {
      alert('图片上传失败: ' + error.message);
      return;
    }
    const { data } = supabase.storage.from('theater-images').getPublicUrl(fileName);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
  }, [editor, supabase]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) insertImage(file);
    e.target.value = '';
  };

  if (!editor) return null;

  return (
    <div className="border border-black/10 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-black/10 bg-[#fafaf8] flex-wrap shrink-0">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>I</ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>S</ToolbarButton>
        <div className="w-px h-5 bg-black/10 mx-1" />
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
        <div className="w-px h-5 bg-black/10 mx-1" />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>· 列表</ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>引用</ToolbarButton>
        <div className="w-px h-5 bg-black/10 mx-1" />
        <label className="text-xs px-2 py-1 rounded-lg cursor-pointer hover:bg-black/5">
          插入图片
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>
      <div
        className="px-4 py-3 h-[520px] overflow-y-auto
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-black/15
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-black/25"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-lg transition ${active ? 'bg-[#1a1a1a] text-white' : 'hover:bg-black/5'}`}
    >
      {children}
    </button>
  );
}
