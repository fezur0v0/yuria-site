'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface PortfolioItem {
  id: string;
  title: string;
  category: string | null;
  date: string | null;
}

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, category, date')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-serif">作品集管理</h1>
        <Link
          href="/admin/portfolio/new"
          className="text-sm px-4 py-2 rounded-xl bg-[#1a1a1a] text-white hover:opacity-90 transition"
        >
          + 新建作品
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-black/40">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-black/40">还没有作品,点右上角新建一个吧~</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/portfolio/${item.id}/edit`}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#fafaf8] hover:bg-black/5 transition"
            >
              <span className="text-sm">{item.title}</span>
              <span className="text-xs text-black/40">
                {item.category} {item.date}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
