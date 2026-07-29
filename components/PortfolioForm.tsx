'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PortfolioEditor from '@/components/PortfolioEditor';
import { FiImage, FiCamera } from 'react-icons/fi';
import { GrFormPrevious, GrSave, GrTrash } from 'react-icons/gr';

interface PortfolioFormProps {
  initialData?: {
    id: string;
    title: string;
    category: string | null;
    date: string | null;
    tags: string[] | null;
    content: string | null;
    cover_url: string | null;
  };
}

export default function PortfolioForm({ initialData }: PortfolioFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [date, setDate] = useState(initialData?.date ?? '');
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [content, setContent] = useState(initialData?.content ?? '');
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_url ?? '');
  const [saving, setSaving] = useState(false);

  const handleCoverUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `cover-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('theater-images').upload(fileName, file);
    if (error) {
      alert('封面上传失败: ' + error.message);
      return;
    }
    const { data } = supabase.storage.from('theater-images').getPublicUrl(fileName);
    setCoverUrl(data.publicUrl);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('标题不能为空');
      return;
    }
    setSaving(true);

    const payload = {
      title,
      category: category || null,
      date: date || null,
      tags,
      content: normalizeContentHtml(content),
      cover_url: coverUrl || null,
      updated_at: new Date().toISOString(),
    };

    if (isEdit) {
      const { error } = await supabase.from('portfolio_items').update(payload).eq('id', initialData!.id);
      setSaving(false);
      if (error) return alert('保存失败: ' + error.message);
      router.push(`/portfolio/${initialData!.id}`);
    } else {
      const { data, error } = await supabase.from('portfolio_items').insert(payload).select('id').single();
      setSaving(false);
      if (error) return alert('创建失败: ' + error.message);
      router.push(`/portfolio/${data.id}`);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm('确定要删除这条作品吗?')) return;
    const { error } = await supabase.from('portfolio_items').delete().eq('id', initialData!.id);
    if (error) return alert('删除失败: ' + error.message);
    router.push('/admin/portfolio');
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#fafafa]">
      {/* 顶部: 两端分布 */}
      <header className="h-20 w-full px-8 flex items-center justify-between border-b border-black/10 bg-white/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 flex items-center justify-center rounded-2xl text-black/60 hover:text-black hover:bg-black/5 transition-all active:scale-95"
            title="返回"
          >
            <GrFormPrevious size={32} />
          </button>
          <h1 className="text-2xl font-serif font-bold text-black/80">
            {isEdit ? '编辑作品' : '新建作品'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {isEdit && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2.5 text-base font-medium px-5 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all active:scale-95"
            >
              <GrTrash size={20} />
              <span className="hidden sm:inline">删除作品</span>
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2.5 text-base font-semibold px-7 py-3 rounded-2xl bg-[#1a1a1a] text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shadow-md"
          >
            <GrSave size={20} />
            {saving ? '保存中…' : isEdit ? '保存修改' : '发布'}
          </button>
        </div>
      </header>

      {/* 核心两栏内容区 */}
      <div className="flex-1 w-full flex flex-col lg:flex-row min-h-0 p-4 sm:p-8 gap-6 lg:gap-12">
        {/* 左侧栏：删除了边框卡片背景，精简且放大 Label */}
        <aside className="w-full lg:w-[420px] flex-shrink-0 lg:overflow-y-auto lg:pr-2 space-y-6 lg:space-y-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div>
            <label className="text-lg font-serif font-semibold text-black/80 mb-2.5 block tracking-wide">
              作品标题
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="在此输入标题…"
              className="w-full text-2xl font-serif font-bold border-b-2 border-black/15 bg-transparent pb-3 focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div>
            <label className="text-lg font-serif font-semibold text-black/80 mb-2.5 block tracking-wide">
              分类
            </label>
            <CategoryPicker value={category} onChange={setCategory} />
          </div>

          <div>
            <label className="text-lg font-serif font-semibold text-black/80 mb-2.5 block tracking-wide">
              发布日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-base font-medium border border-black/15 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-black transition-colors bg-white/80"
            />
          </div>

          <div>
            <label className="text-lg font-serif font-semibold text-black/80 mb-2.5 block tracking-wide">
              标签
            </label>
            <TagsInput tags={tags} setTags={setTags} />
          </div>

          <div>
            <label className="text-lg font-serif font-semibold text-black/80 mb-3 block tracking-wide">
              封面图像
            </label>
            {coverUrl ? (
              <label className="relative group rounded-3xl overflow-hidden block cursor-pointer border border-black/10 shadow-sm">
                <img src={coverUrl} alt="封面预览" className="w-full max-h-72 object-cover" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-base font-medium flex items-center gap-2 bg-black/50 px-5 py-2.5 rounded-full backdrop-blur-md">
                    <FiCamera size={20} /> 更换封面图
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverUpload(file);
                  }}
                />
              </label>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-black/15 rounded-3xl h-60 cursor-pointer hover:border-black/40 hover:bg-black/[0.02] transition-colors text-black/40">
                <FiImage size={38} />
                <span className="text-base font-medium">点击上传或替换封面</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverUpload(file);
                  }}
                />
              </label>
            )}
          </div>
        </aside>

        {/* 右侧主编辑区 */}
        <main className="flex-1 min-w-0 lg:h-full flex flex-col">
          <PortfolioEditor content={content} onChange={setContent} />
        </main>
      </div>
    </div>
  );
}

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('portfolio_items').select('category').then(({ data }) => {
      const unique = Array.from(new Set((data ?? []).map((d: { category: string | null }) => d.category).filter(Boolean))) as string[];
      setOptions(unique);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(value.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="选择或输入分类"
        className="w-full text-base font-medium border border-black/15 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-black transition-colors bg-white/80"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-black/10 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-30 py-1">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left text-base font-medium px-5 py-3 hover:bg-black/5 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagsInput({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border border-black/15 rounded-2xl px-4 py-3 focus-within:border-black min-h-[56px] bg-white/80">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1.5 text-sm bg-black/5 rounded-xl px-3 py-1.5 font-medium">
          #{tag}
          <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-black/40 hover:text-black ml-0.5">
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? '按回车添加标签…' : ''}
        style={{ border: 'none', outline: 'none', fontSize: '15px', minWidth: '100px', flex: 1, background: 'transparent' }}
      />
    </div>
  );
}

function normalizeContentHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('img[containerstyle], img[wrapperstyle]').forEach((img) => {
    const containerStyle = img.getAttribute('containerstyle') || '';
    const widthMatch = containerStyle.match(/width:\s*([\d.]+px)/);
    if (widthMatch) {
      (img as HTMLElement).style.width = widthMatch[1];
      (img as HTMLElement).style.height = 'auto';
    }
    img.removeAttribute('containerstyle');
    img.removeAttribute('wrapperstyle');
  });
  return doc.body.innerHTML;
}
