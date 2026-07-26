'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PortfolioEditor from '@/components/PortfolioEditor';
import { FiImage, FiCamera } from 'react-icons/fi';
import { GrFormPrevious } from 'react-icons/gr';

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
      content,
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
   <div className="max-w-[1400px] mx-auto px-12 py-10">
      {/* 顶部:返回箭头 + 标题 —— 保存/删除按钮 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full text-black/40 hover:text-black/70 hover:bg-black/5 transition-colors"
            title="返回"
          >
           <GrFormPrevious size={18} />
          </button>
          <h1 className="text-xl font-serif">{isEdit ? '编辑作品' : '新建作品'}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-xl bg-[#1a1a1a] text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? '保存中…' : isEdit ? '保存修改' : '发布'}
          </button>
          {isEdit && (
            <button onClick={handleDelete} className="text-sm px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors">
              删除
            </button>
          )}
        </div>
      </div>

      {/* 左右两栏:左边元数据,右边正文编辑器 */}
  <div className="flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[340px] flex-shrink-0 space-y-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
            className="w-full text-lg font-serif border-b border-black/10 pb-2 focus:outline-none focus:border-black/30"
          />

          <CategoryPicker value={category} onChange={setCategory} />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-sm border border-black/10 rounded-xl px-3 py-2 focus:outline-none focus:border-black/30"
          />

          <TagsInput tags={tags} setTags={setTags} />

          <div>
            <label className="text-sm text-black/50 mb-2 block">封面图</label>
            {coverUrl ? (
              <label className="relative group rounded-2xl overflow-hidden block cursor-pointer">
                <img src={coverUrl} alt="封面预览" className="w-full max-h-56 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-xs flex items-center gap-1.5">
                    <FiCamera size={14} /> 更换封面
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
              <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-black/15 rounded-2xl h-40 cursor-pointer hover:border-black/30 hover:bg-black/[0.02] transition-colors text-black/40">
                <FiImage size={20} />
                <span className="text-xs">点击上传封面</span>
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
        </div>

    <div className="w-full lg:w-[760px] flex-shrink-0">
          <PortfolioEditor content={content} onChange={setContent} />
        </div>
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
        placeholder="分类"
        className="w-full text-sm border border-black/10 rounded-xl px-3 py-2 focus:outline-none focus:border-black/30"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-sm max-h-48 overflow-y-auto z-10">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left text-sm px-3 py-2 hover:bg-black/5 transition-colors"
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
    <div className="flex flex-wrap items-center gap-1.5 border border-black/10 rounded-xl px-3 py-2 focus-within:border-black/30">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 text-xs bg-black/5 rounded-full px-2.5 py-1">
          {tag}
          <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-black/30 hover:text-black/60">
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? '输入标签后按回车…' : ''}
        style={{ border: 'none', outline: 'none', fontSize: '13px', minWidth: '80px', flex: 1, background: 'transparent', maxWidth: '100%' }}
      />
    </div>
  );
}
