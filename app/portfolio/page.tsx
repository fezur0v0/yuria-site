'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import PortfolioNav from '@/components/PortfolioNav';
import PortfolioHero from '@/components/PortfolioHero';
import PortfolioBackground from '@/components/PortfolioBackground';
import SidebarProfile from '@/components/SidebarProfile';
import SidebarCategoryTags from '@/components/SidebarCategoryTags';
import SidebarArchiveHeatmap from '@/components/SidebarArchiveHeatmap';

interface PortfolioItem {
  id: string;
  title: string;
  category: string | null;
  date: string | null;
  tags: string[] | null;
  cover_url: string | null;
  content: string | null;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim();
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, category, date, tags, cover_url, content')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      <PortfolioBackground />
      <PortfolioNav />
      <PortfolioHero />

      <div className="bg-[#fafaf8] relative z-10 rounded-t-[32px]">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col lg:flex-row gap-16">
          <aside className="order-2 lg:order-1 w-full lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <SidebarProfile />
              <SidebarCategoryTags />
              <SidebarArchiveHeatmap />
            </div>
          </aside>

          <main className="order-1 lg:order-2 flex-1 min-w-0">
            {loading ? (
              <p className="text-sm text-black/40">加载中…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-black/40">还没有作品~</p>
            ) : (
              <div>
                {items.map((item) => {
                  const excerpt = item.content ? stripHtml(item.content).slice(0, 80) : '';
                  return (
                    <Link
                      key={item.id}
                      href={`/portfolio/${item.id}`}
                      className="flex items-start justify-between gap-6 py-8 border-b border-black/5 hover:opacity-80 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 text-xs text-black/40 mb-2">
                          {item.date && <span>{item.date}</span>}
                          {item.category && (
                            <span className="px-2 py-0.5 rounded-full bg-black/5">{item.category}</span>
                          )}
                        </div>
                        <h2 className="font-serif text-xl mb-2">{item.title}</h2>
                        {excerpt && <p className="text-sm text-black/50 line-clamp-2 mb-2">{excerpt}</p>}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {item.tags.map((tag) => (
                              <span key={tag} className="text-xs text-black/30">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.cover_url && (
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="w-40 h-28 object-cover rounded-xl flex-shrink-0"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
