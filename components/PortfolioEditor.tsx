'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';

const CustomImage = ImageResize.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'left',
     renderHTML: (attributes: { align?: string }) => {
  const align = attributes.align || 'left';

  return {
    'data-align': align,
    style:
      align === 'center'
        ? 'display:block;margin:1.5rem auto;'
        : align === 'right'
        ? 'display:block;margin:1.5rem 0 1.5rem auto;'
        : 'display:block;margin:1.5rem auto 1.5rem 0;',
            };
         },
      },
    };
  },
});

import { useCallback, type ReactNode, type ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  GrBold,
  GrItalic,
  GrUnderline,
  GrStrikeThrough,
  GrTextAlignLeft,
  GrTextAlignCenter,
  GrTextAlignRight,
  GrUnorderedList,
  GrBlockQuote,
  GrImage,
} from 'react-icons/gr';
import { PiTextHTwo, PiTextHThree } from 'react-icons/pi';

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
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CustomImage.configure({
        HTMLAttributes: { class: 'rounded-xl' },
        minWidth: 80,
        maxWidth: 800,
      }),
      Placeholder.configure({ placeholder: '在此写下你的故事…' }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // prose-xl 放大排版文字，h-full 铺满容器
        class: 'prose prose-xl prose-neutral max-w-none focus:outline-none min-h-full pb-10',
      },
    },
  });

 const setAlign = (align: 'left' | 'center' | 'right') => {
    if (!editor) return;
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { align }).run();
    } else {
      editor.chain().focus().setTextAlign(align).run();
    }
  };

  const isAlignActive = (align: 'left' | 'center' | 'right') => {
    if (!editor) return false;
    return editor.isActive('image')
      ? editor.isActive('image', { align })
      : editor.isActive({ textAlign: align });
  };

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

const setImageAlign = (align: 'left' | 'center' | 'right') => {
    editor?.chain().focus().updateAttributes('image', { align }).run();
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) insertImage(file);
    e.target.value = '';
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 悬浮工具栏 — 放大按键与 Icon 尺寸 */}
      <div className="flex items-center gap-2 flex-wrap bg-white px-4 py-3 rounded-2xl border border-black/5 shadow-sm flex-shrink-0">
        <IconButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="粗体">
          <GrBold size={20} />
        </IconButton>
        <IconButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体">
          <GrItalic size={20} />
        </IconButton>
        <IconButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线">
          <GrUnderline size={20} />
        </IconButton>
        <IconButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线">
          <GrStrikeThrough size={20} />
        </IconButton>
        <IconButton active={isAlignActive('left')} onClick={() => setAlign('left')} title="靠左">
          <GrTextAlignLeft size={20} />
        </IconButton>
        <IconButton active={isAlignActive('center')} onClick={() => setAlign('center')} title="居中">
          <GrTextAlignCenter size={20} />
        </IconButton>
        <IconButton active={isAlignActive('right')} onClick={() => setAlign('right')} title="靠右">
          <GrTextAlignRight size={20} />
        </IconButton>

        <div className="w-[1px] h-6 bg-black/10 mx-1" />
        <IconButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="列表">
          <GrUnorderedList size={20} />
        </IconButton>
        <IconButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="二级标题">
          <PiTextHTwo size={24} />
        </IconButton>
        <IconButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="三级标题">
          <PiTextHThree size={24} />
        </IconButton>
        <IconButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用">
          <GrBlockQuote size={20} />
        </IconButton>

        <div className="w-[1px] h-6 bg-black/10 mx-1" />

        <label
          title="插入图片"
          className="text-black/60 hover:text-black hover:bg-black/5 p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center"
        >
          <GrImage size={20} />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>

      {/* 编辑器内容容器 — h-full 自适应撑满屏幕，内部出现滚动条 */}
<div className="flex-1 min-h-0 bg-white border border-black/5 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div
          className="flex-1 p-8 overflow-y-auto
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-black/15
            [&::-webkit-scrollbar-thumb]:rounded-full
            hover:[&::-webkit-scrollbar-thumb]:bg-black/30"
        >
          <EditorContent editor={editor} className="h-full" />
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
      className={`p-3 rounded-xl transition-all ${
        active
          ? 'bg-[#1a1a1a] text-white shadow-md scale-105'
          : 'text-black/60 hover:text-black hover:bg-black/5'
      }`}
    >
      {children}
    </button>
  );
}
