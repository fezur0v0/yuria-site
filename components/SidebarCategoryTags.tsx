'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Item {
  id: string;
  title: string;
  category: string | null;
}

export default function SidebarCategoryTags() {
  const [items, setItems] = useState<Item[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, category')
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const grouped: Record<string, Item[]> = {};
  items.forEach((item) => {
    if (item.category) {
      grouped[item.category] = grouped[item.category] ?? [];
      grouped[item.category].push(item);
    }
  });
  const categories = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  if (categories.length === 0) return null;

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-8">
      <h4 className="text-lg font-bold text-black mb-4">分类</h4>
      <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {categories.map(([name, catItems]) => {
          const isOpen = expanded.has(name);
          return (
            <div key={name} className="mb-1">
              <button
                onClick={() => toggle(name)}
                className="w-full flex items-center justify-between py-2 text-sm hover:bg-black/5 rounded-lg px-2 transition"
              >
                <span>
                  {name} <span className="text-black/30">{catItems.length}</span>
                </span>
                <span className={`text-black/40 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="pl-4 flex flex-col gap-2.5 pb-3 pt-1">
                  {catItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/portfolio/${item.id}`}
                      className="text-xs text-black/60 hover:text-black transition line-clamp-1 py-0.5"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
