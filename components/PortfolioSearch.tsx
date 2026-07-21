'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Item {
  id: string;
  title: string;
  content: string | null;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[#70B0CC] font-medium">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function PortfolioSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('portfolio_items').select('id, title, content').then(({ data }) => setItems(data ?? []));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? items
        .filter((item) => item.title.toLowerCase().includes(q) || stripHtml(item.content ?? '').toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition text-white"
        title="搜索"
      >
        🔍
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-lg p-4 text-black">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题或内容…"
            className="w-full text-sm border-b border-black/10 pb-2 mb-3 focus:outline-none focus:border-black/30"
          />
          <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {q && results.length === 0 && <p className="text-xs text-black/30 py-2">没有找到相关内容</p>}
            {results.map((item) => {
              const contentText = stripHtml(item.content ?? '');
              const contentIdx = contentText.toLowerCase().indexOf(q);
              const snippet =
                contentIdx > -1 ? contentText.slice(Math.max(0, contentIdx - 15), contentIdx + 40) : contentText.slice(0, 40);
              return (
                <Link
                  key={item.id}
                  href={`/portfolio/${item.id}`}
                  onClick={() => setOpen(false)}
                  className="block py-2 border-b border-black/5 last:border-0 hover:bg-black/5 rounded-lg px-2 transition"
                >
                  <p className="text-sm mb-0.5">{highlight(item.title, q)}</p>
                  {snippet && <p className="text-xs text-black/40 line-clamp-1">{highlight(snippet, q)}</p>}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
