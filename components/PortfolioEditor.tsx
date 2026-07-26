'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, type ReactNode, type ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  GrBold,
  GrItalic,
  GrUnderline,
  GrStrikeThrough,
  GrUnorderedList,
  GrBlockQuote,
  GrImage,
} from 'react-icons/gr';

interface PortfolioEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function PortfolioEditor({ content, onChange }: PortfolioEditorProps) {
  const supabase = createClient();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
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
    <div className="flex flex-col gap-3">
      {/* 工具栏 — 不带边框,悬浮在编辑框上方 */}
      <div className="flex items-center gap-1 flex-wrap">
        <IconButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="粗体">
          <GrBold size={13} />
        </IconButton>
        <IconButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体">
          <GrItalic size={13} />
        </IconButton>
        <IconButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线">
          <GrUnderline size={13} />
        </IconButton>
        <IconButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线">
          <GrStrikeThrough size={13} />
        </IconButton>
        <IconButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="列表">
          <GrUnorderedList size={13} />
        </IconButton>
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
        <IconButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用">
          <GrBlockQuote size={13} />
        </IconButton>
        <label
          title="插入图片"
          className="text-black/50 hover:text-black/80 hover:bg-black/5 p-2 rounded-lg cursor-pointer transition-colors flex items-center"
        >
          <GrImage size={13} />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>

      {/* 正文 — 独立的框框 */}
      <div className="border border-black/10 rounded-2xl overflow-hidden">
        <div
          className="px-5 py-4 h-[560px] overflow-y-auto
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-black/15
            [&::-webkit-scrollbar-thumb]:rounded-full
            hover:[&::-webkit-scrollbar-thumb]:bg-black/25"
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, active, onClick, title }: { children: ReactNode; active?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${active ? 'bg-[#1a1a1a] text-white' : 'text-black/50 hover:text-black/80 hover:bg-black/5'}`}
    >
      {children}
    </button>
  );
}

function ToolbarButton({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-2 rounded-lg transition-colors ${active ? 'bg-[#1a1a1a] text-white' : 'text-black/50 hover:text-black/80 hover:bg-black/5'}`}
    >
      {children}
    </button>
  );
}
