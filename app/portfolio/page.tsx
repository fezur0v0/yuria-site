'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface PortfolioItem {
  id: string;
  title: string;
  category: string | null;
  date: string | null;
  tags: string[] | null;
  cover_url: string | null;
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('全部');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, category, date, tags, cover_url')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  const categories = ['全部', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[]))];
  const filtered = activeCategory === '全部' ? items : items.filter((i) => i.category === activeCategory);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-serif mb-6">作品集</h1>

      <div className="flex gap-2 mb-8 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-sm px-3 py-1.5 rounded-full transition ${
              activeCategory === cat ? 'bg-[#1a1a1a] text-white' : 'bg-black/5 hover:bg-black/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-black/40">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-black/40">这个分类还没有作品~</p>
      ) : (
        <div className="[column-count:1] sm:[column-count:2] lg:[column-count:3] gap-5 [column-gap:1.25rem]">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/portfolio/${item.id}`}
              className="block mb-5 break-inside-avoid rounded-2xl bg-[#fafaf8] overflow-hidden hover:opacity-90 transition"
            >
              {item.cover_url && (
                <img src={item.cover_url} alt={item.title} className="w-full object-cover" />
              )}
              <div className="p-4">
                <h2 className="font-serif text-base mb-1">{item.title}</h2>
                {item.date && <p className="text-xs text-black/40 mb-2">{item.date}</p>}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-black/5 text-black/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
