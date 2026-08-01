'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
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
import { PiTextHTwo, PiTextHThree, PiTextAlignLeft, PiTextAlignCenter, PiTextAlignRight, PiSparkle } from 'react-icons/pi';

// 给 ImageResize 扩展加一个 align 属性，序列化成 data-align，
// globals.css 里已经有对应的居中/靠左/靠右样式了
const AlignableImage = ImageResize.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align'),
        renderHTML: (attributes: { align?: string | null }) => {
          if (!attributes.align) return {};
          return { 'data-align': attributes.align };
        },
      },
    };
  },
});

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
      AlignableImage.configure({
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
        class: 'prose prose-xl prose-neutral max-w-none focus:outline-none min-h-full pb-10',
      },
    },
  });

  const insertImage = useCallback(async (file: File) => {
    if (!editor) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('theater-images').upload(fileName, file);
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

  // 选中的是图片就调图片对齐，否则调文字段落对齐——同一组按钮
  const applyAlign = (align: 'left' | 'center' | 'right') => {
    if (editor.isActive('imageResize')) {
      editor.chain().focus().updateAttributes('imageResize', { align }).run();
    } else {
      editor.chain().focus().setTextAlign(align).run();
    }
  };

  const isAlignActive = (align: 'left' | 'center' | 'right') => {
    if (editor.isActive('imageResize')) return editor.isActive('imageResize', { align });
    return editor.isActive({ textAlign: align });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 固定工具栏 */}
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
        <IconButton active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线">
          <PiSparkle size={20} />
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

      {/* 选中文字或图片时，上方弹出的浮动对齐菜单 */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        shouldShow={({ editor, state }) => editor.isActive('imageResize') || !state.selection.empty}
      >
        <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 py-1.5 rounded-xl shadow-lg">
          <BubbleButton active={isAlignActive('left')} onClick={() => applyAlign('left')} title="靠左">
            <PiTextAlignLeft size={18} />
          </BubbleButton>
          <BubbleButton active={isAlignActive('center')} onClick={() => applyAlign('center')} title="居中">
            <PiTextAlignCenter size={18} />
          </BubbleButton>
          <BubbleButton active={isAlignActive('right')} onClick={() => applyAlign('right')} title="靠右">
            <PiTextAlignRight size={18} />
          </BubbleButton>
        </div>
      </BubbleMenu>

      {/* 编辑器内容容器 */}
  <div className="h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 bg-white border border-black/5 rounded-3xl shadow-sm overflow-hidden flex flex-col">
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

function BubbleButton({ children, active, onClick, title }: { children: ReactNode; active?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10 ${
        active ? 'bg-white/20 text-white' : ''
      }`}
    >
      {children}
    </button>
  );
}
