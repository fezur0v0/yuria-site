'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { SortableList } from '@/components/admin/SortableList';
import {
  MdOutlineEdit,
  MdOutlineVisibility,
  MdOutlineVisibilityOff,
  MdOutlineDelete,
} from 'react-icons/md';

const supabase = createClient();

interface PortfolioItem {
  id: string;
  title: string;
  category: string | null;
  date: string | null;
  cover_url: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
}

interface HeroLine {
  id: string;
  text: string;
  sort_order: number;
}

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Hero 设置
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroLines, setHeroLines] = useState<HeroLine[]>([]);
  const [newLine, setNewLine] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchItems();
    fetchHero();
    fetchHeroLines();
  }, []);

  async function fetchItems() {
    const { data } = await supabase
      .from('portfolio_items')
      .select('id, title, category, date, cover_url, sort_order, is_visible')
      .order('sort_order', { ascending: true, nullsFirst: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function handleReorder(newOrder: PortfolioItem[]) {
    setItems(newOrder);
    await Promise.all(
      newOrder.map((it, i) => supabase.from('portfolio_items').update({ sort_order: i + 1 }).eq('id', it.id))
    );
  }

  async function toggleVisible(item: PortfolioItem) {
    await supabase.from('portfolio_items').update({ is_visible: !item.is_visible }).eq('id', item.id);
    fetchItems();
  }

  // ---- Hero 图 + 标题（site_settings 单行表）----
  async function fetchHero() {
    const { data } = await supabase.from('site_settings').select('hero_image_url, hero_title').single();
    if (data) {
      setHeroImageUrl(data.hero_image_url || '');
      setHeroTitle(data.hero_title || '');
    }
  }

  async function saveHero() {
    setHeroSaving(true);
    await supabase.from('site_settings').update({ hero_image_url: heroImageUrl, hero_title: heroTitle }).eq('id', true);
    setHeroSaving(false);
    showMsg('已保存 ✓');
  }

  // ---- Hero 副标题行 ----
  async function fetchHeroLines() {
    const { data } = await supabase.from('hero_lines').select('*').order('sort_order');
    setHeroLines(data || []);
  }

  async function addLine() {
    if (!newLine.trim()) return;
    await supabase.from('hero_lines').insert({ text: newLine.trim(), sort_order: heroLines.length });
    setNewLine('');
    fetchHeroLines();
  }

  async function deleteLine(id: string) {
    await supabase.from('hero_lines').delete().eq('id', id);
    fetchHeroLines();
  }

  async function handleLineReorder(newOrder: HeroLine[]) {
    setHeroLines(newOrder);
    await Promise.all(
      newOrder.map((l, i) => supabase.from('hero_lines').update({ sort_order: i }).eq('id', l.id))
    );
  }

  function showMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  }

  return (
    <div className="max-w-2xl space-y-14">
      {msg && <div className="text-xs text-green-600 bg-green-50 px-4 py-2 rounded-xl">{msg}</div>}

      {/* ===== 作品管理 ===== */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            style={{ fontFamily: 'Noto Serif SC,serif' }}
            className="text-2xl font-light tracking-wide text-black/80"
          >
            作品集
          </h1>
          <Link
            href="/admin/portfolio/new"
            className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 transition"
          >
            + 新建作品
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-black/35">加载中…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-black/35">还没有作品，点右上角新建一个吧~</p>
        ) : (
          <SortableList
            items={items}
            onReorder={handleReorder}
            renderItem={(item, handle) => (
              <div
                className={`flex items-center gap-3 px-3 py-3 bg-white border border-black/[0.06] rounded-xl mb-2 transition-opacity ${
                  item.is_visible === false ? 'opacity-40' : ''
                }`}
              >
                {handle}
                {item.cover_url ? (
                  <img src={item.cover_url} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-black/[0.04] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-black/80 truncate">{item.title}</div>
                  <div className="text-xs text-black/35 mt-0.5">
                    {item.category}
                    {item.date ? ` · ${item.date}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => toggleVisible(item)}
                  className="text-black/25 hover:text-black/60 p-1.5"
                  title={item.is_visible === false ? '点击展示' : '点击隐藏'}
                >
                  {item.is_visible === false ? <MdOutlineVisibilityOff size={17} /> : <MdOutlineVisibility size={17} />}
                </button>
                <Link
                  href={`/admin/portfolio/${item.id}/edit`}
                  className="text-black/25 hover:text-black/70 transition-colors p-1.5"
                  title="编辑"
                >
                  <MdOutlineEdit size={17} />
                </Link>
              </div>
            )}
          />
        )}
      </section>

      {/* ===== 作品集首页设置 ===== */}
      <section className="space-y-6 pt-2 border-t border-black/[0.06]">
        <h2
          style={{ fontFamily: 'Noto Serif SC,serif' }}
          className="text-xl font-light tracking-wide text-black/80 pt-8"
        >
          作品集首页设置
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-black/40 mb-1.5 block">背景图 URL</label>
            <input
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black/40"
              placeholder="https://..."
            />
            {heroImageUrl && (
              <img
                src={heroImageUrl}
                className="mt-3 h-32 w-full rounded-xl object-cover"
                alt="预览"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>
          <div>
            <label className="text-xs text-black/40 mb-1.5 block">标题</label>
            <input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black/40"
              placeholder="白水鉴心"
            />
          </div>
          <button
            onClick={saveHero}
            disabled={heroSaving}
            className="bg-black text-white rounded-xl px-6 py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
          >
            {heroSaving ? '保存中...' : '保存'}
          </button>
        </div>

        {/* 副标题行 */}
        <div className="pt-2">
          <label className="text-xs text-black/40 mb-2 block">副标题内容（可拖动排序）</label>
          <SortableList
            items={heroLines}
            onReorder={handleLineReorder}
            renderItem={(line, handle) => (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-black/[0.06] rounded-xl mb-2">
                {handle}
                <span className="flex-1 text-sm text-black/70">{line.text}</span>
                <button onClick={() => deleteLine(line.id)} className="text-black/25 hover:text-red-500 p-1">
                  <MdOutlineDelete size={16} />
                </button>
              </div>
            )}
          />
          <div className="flex gap-2 mt-2">
            <input
              value={newLine}
              onChange={(e) => setNewLine(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLine()}
              className="flex-1 border border-black/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black/40"
              placeholder="新增一行副标题…"
            />
            <button
              onClick={addLine}
              className="px-5 py-2.5 rounded-xl bg-black/[0.05] text-black/60 text-sm hover:bg-black/10"
            >
              添加
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
