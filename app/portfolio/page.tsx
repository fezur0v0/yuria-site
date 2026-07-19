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

     <div className="relative z-10 max-w-7xl mx-auto px-8 py-16 flex gap-12">
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-24 flex flex-col gap-5">
            <SidebarProfile />
            <SidebarCategoryTags />
            <SidebarArchiveHeatmap />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
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
                   className="flex items-start justify-between gap-8 p-8 mb-6 rounded-2xl bg-white/70 backdrop-blur-md shadow-sm hover:bg-white/85 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 text-xs text-black/40 mb-2">
                        {item.date && <span>{item.date}</span>}
                        {item.category && (
                          <span className="px-2 py-0.5 rounded-full bg-black/5">{item.category}</span>
                        )}
                      </div>
                      <h2 className="font-serif text-2xl mb-3">{item.title}</h2>
                      {excerpt && <p className="text-base text-black/50 line-clamp-2 mb-3">{excerpt}</p>}
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
                        className="w-56 h-40 object-cover rounded-xl flex-shrink-0"
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
  );
}
