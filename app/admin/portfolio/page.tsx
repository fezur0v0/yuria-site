'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { SortableList } from '@/components/admin/SortableList';
import { MdOutlineEdit } from 'react-icons/md';

const supabase = createClient();

interface PortfolioItem {
  id: string;
  title: string;
  category: string | null;
  date: string | null;
  cover_url: string | null;
  sort_order: number | null;
}

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    const { data } = await supabase
      .from('portfolio_items')
      .select('id, title, category, date, cover_url, sort_order')
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

  return (
    <section className="max-w-2xl space-y-6">
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
            <div className="flex items-center gap-3 px-3 py-3 bg-white border border-black/[0.06] rounded-xl mb-2">
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
              <Link
                href={`/admin/portfolio/${item.id}/edit`}
                className="text-black/25 hover:text-black/70 transition-colors p-2"
                title="编辑"
              >
                <MdOutlineEdit size={17} />
              </Link>
            </div>
          )}
        />
      )}
    </section>
  );
}
