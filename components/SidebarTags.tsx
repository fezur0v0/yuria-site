'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Item {
  id: string;
  title: string;
  tags: string[] | null;
}

const NOTE_COLORS = [
  'bg-[#ABBBD1]/50',  
  'bg-[#C6D8E6]/50',  
  'bg-[#DCECED]/50',  
  'bg-[#FEFDF8]/50',  
];
const ROTATIONS = ['-rotate-3', 'rotate-2', '-rotate-1', 'rotate-3', 'rotate-1'];

export default function SidebarTags() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<{ tag: string; colorIndex: number } | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('portfolio_items').select('id, title, tags').then(({ data }) => setItems(data ?? []));
  }, []);

  const tagCounts: Record<string, number> = {};
  items.forEach((item) => (item.tags ?? []).forEach((t) => (tagCounts[t] = (tagCounts[t] ?? 0) + 1)));
  const tags = Object.keys(tagCounts);

  if (tags.length === 0) return null;

  const handleSelect = (tag: string, colorIndex: number) => {
    setAnimating(true);
    setTimeout(() => {
      setSelected({ tag, colorIndex });
      setAnimating(false);
    }, 200);
  };

  const handleClose = () => {
    setAnimating(true);
    setTimeout(() => {
      setSelected(null);
      setAnimating(false);
    }, 200);
  };

  const filteredItems = selected ? items.filter((item) => item.tags?.includes(selected.tag)) : [];

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-8">
      <h4 className="text-lg font-bold text-black mb-4">标签</h4>

      <div className={`transition-all duration-200 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {selected ? (
          <div
            className={`relative max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden rounded-lg p-4 pt-6 ${NOTE_COLORS[selected.colorIndex % NOTE_COLORS.length]}`}
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/70 rotate-1 shadow-sm" />
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/60 hover:bg-white/90 text-black/50 hover:text-black transition text-sm"
            >
              ×
            </button>
            <p className="text-sm font-bold mb-3">#{selected.tag}</p>
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
                onClick={() => handleSelect(tag, i)}
                className={`text-xs px-3 py-2 rounded-sm shadow-sm hover:shadow-md hover:scale-105 transition-all ${NOTE_COLORS[i % NOTE_COLORS.length]} ${ROTATIONS[i % ROTATIONS.length]}`}
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
