'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PortfolioEditor from '@/components/PortfolioEditor';

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
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') ?? '');
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

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

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
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">
      <h1 className="text-xl font-serif">{isEdit ? '编辑作品' : '新建作品'}</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="w-full text-lg font-serif border-b border-black/10 pb-2 focus:outline-none focus:border-black/30"
      />

      <div className="flex gap-4">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="分类"
          className="flex-1 text-sm border border-black/10 rounded-xl px-3 py-2 focus:outline-none focus:border-black/30"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 text-sm border border-black/10 rounded-xl px-3 py-2 focus:outline-none focus:border-black/30"
        />
      </div>

      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="标签(用逗号分隔,比如: 插画, 练习)"
        className="w-full text-sm border border-black/10 rounded-xl px-3 py-2 focus:outline-none focus:border-black/30"
      />

      <div>
        <label className="text-sm text-black/50 mb-2 block">封面图</label>
        {coverUrl && <img src={coverUrl} alt="封面预览" className="w-full max-h-56 object-cover rounded-xl mb-2" />}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCoverUpload(file);
          }}
          className="text-sm"
        />
      </div>

      <div>
        <label className="text-sm text-black/50 mb-2 block">正文</label>
        <PortfolioEditor content={content} onChange={setContent} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-xl bg-[#1a1a1a] text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? '保存中…' : isEdit ? '保存修改' : '发布'}
        </button>
        {isEdit && (
          <button onClick={handleDelete} className="text-sm px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 transition">
            删除
          </button>
        )}
      </div>
    </div>
  );
}
