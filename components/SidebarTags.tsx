'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Item {
  id: string;
  title: string;
  tags: string[] | null;
}

const NOTE_COLORS = ['bg-yellow-100', 'bg-pink-100', 'bg-blue-100', 'bg-green-100', 'bg-orange-100'];
const ROTATIONS = ['-rotate-3', 'rotate-2', '-rotate-1', 'rotate-3', 'rotate-1'];

export default function SidebarTags() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, tags')
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const tagCounts: Record<string, number> = {};
  items.forEach((item) => (item.tags ?? []).forEach((t) => (tagCounts[t] = (tagCounts[t] ?? 0) + 1)));
  const tags = Object.keys(tagCounts);

  if (tags.length === 0) return null;

  const handleSelect = (tag: string) => {
    setAnimating(true);
    setTimeout(() => {
      setSelectedTag(tag);
      setAnimating(false);
    }, 200);
  };

  const handleBack = () => {
    setAnimating(true);
    setTimeout(() => {
      setSelectedTag(null);
      setAnimating(false);
    }, 200);
  };

  const filteredItems = selectedTag ? items.filter((item) => item.tags?.includes(selectedTag)) : [];

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-8">
      <h4 className="font-serif text-lg text-black mb-4">标签</h4>

      <div className={`transition-all duration-200 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {selectedTag ? (
          <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={handleBack}
              className="text-xs text-black/40 hover:text-black/70 transition mb-3 flex items-center gap-1"
            >
              ← 返回
            </button>
            <p className="text-sm font-serif mb-3">#{selectedTag}</p>
            <div className="flex flex-col gap-2">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/portfolio/${item.id}`}
                  className="text-sm text-black/70 hover:text-black transition line-clamp-1"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex flex-wrap gap-3 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden py-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {tags.map((tag, i) => (
              <button
                key={tag}
                onClick={() => handleSelect(tag)}
                className={`text-xs px-3 py-2 shadow-sm hover:shadow-md hover:scale-105 transition-all ${
                  NOTE_COLORS[i % NOTE_COLORS.length]
                } ${ROTATIONS[i % ROTATIONS.length]}`}
              >
                #{tag} <span className="text-black/30">{tagCounts[tag]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
