'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function SidebarCategoryTags() {
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('category')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((item) => {
          if (item.category) {
            counts[item.category] = (counts[item.category] ?? 0) + 1;
          }
        });
        setCategories(
          Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        );
      });
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="py-6 border-b border-black/10">
      <h4 className="text-xs text-black/40 mb-3 tracking-wide">分类</h4>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            href={`/portfolio/category/${encodeURIComponent(cat.name)}`}
            className="text-xs px-2.5 py-1 rounded-full bg-black/5 hover:bg-black/10 transition"
          >
            {cat.name} <span className="text-black/30">{cat.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
