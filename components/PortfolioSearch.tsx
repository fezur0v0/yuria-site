'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { FiSearch } from 'react-icons/fi';

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
      <span className="text-[#4A90E2] font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function PortfolioSearch() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, content')
      .then(({ data }) => setItems(data ?? []));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const q = query.trim().toLowerCase();
  const results = q
    ? items
        .filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            stripHtml(item.content ?? '').toLowerCase().includes(q)
        )
        .slice(0, 8)
    : [];

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleOpen}
      className="relative flex items-center justify-center"
    >
      {/* 搜索框容器：白色系半透明磨砂 */}
      <div
        onClick={handleOpen}
        className={`flex items-center rounded-2xl transition-all duration-300 ease-out cursor-pointer overflow-hidden ${
          expanded
            ? 'w-56 px-3.5 py-2 bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_4px_15px_rgba(0,0,0,0.05)]'
            : 'w-9 h-9 p-0 bg-transparent border-transparent justify-center'
        }`}
      >
        {/* 左侧图标：纯白 */}
        <FiSearch
          size={16}
          className={`shrink-0 text-white transition-all duration-300 ${
            expanded ? 'mr-2.5 opacity-90' : 'opacity-100'
          }`}
        />

        {/* 右侧输入框 */}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索"
          className={`bg-transparent text-white placeholder:text-white/70 text-sm outline-none transition-all duration-300 ${
            expanded ? 'w-full opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        />
      </div>

      {/* 搜索结果弹窗：手机端基于屏幕中心对齐，桌面端基于搜索框中心对齐 */}
      {expanded && q && (
        <div
          className="
            fixed sm:absolute 
            left-1/2 -translate-x-1/2 
            top-20 sm:top-full 
            mt-2 sm:mt-4 
            w-[calc(100vw-32px)] max-w-sm sm:w-72 
            max-h-80 overflow-y-auto 
            flex flex-col gap-1 p-2 rounded-2xl 
            bg-white/85 backdrop-blur-2xl border border-white/80 
            shadow-[0_12px_30px_rgba(0,0,0,0.12)] 
            z-50 animate-in fade-in slide-in-from-top-2 duration-200 
            [&::-webkit-scrollbar]:hidden
          "
          style={{ scrollbarWidth: 'none' }}
        >
          {results.length === 0 ? (
            <p className="text-xs text-black/40 text-center py-5 font-medium tracking-wide">
              ✦ 未找到相关内容 ✦
            </p>
          ) : (
            results.map((item) => {
              const contentText = stripHtml(item.content ?? '');
              const contentIdx = contentText.toLowerCase().indexOf(q);
              const snippet =
                contentIdx > -1
                  ? contentText.slice(Math.max(0, contentIdx - 15), contentIdx + 40)
                  : contentText.slice(0, 40);

              return (
                <Link
                  key={item.id}
                  href={`/portfolio/${item.id}`}
                  onClick={() => {
                    setExpanded(false);
                    setQuery('');
                  }}
                  className="group block p-3 sm:p-2.5 rounded-xl hover:bg-black/5 active:scale-[0.98] transition-all duration-200"
                >
                  <p className="text-xs font-semibold text-black/80 group-hover:text-black mb-0.5 line-clamp-1 transition-colors">
                    {highlight(item.title, q)}
                  </p>
                  {snippet && (
                    <p className="text-[11px] text-black/45 group-hover:text-black/65 line-clamp-1 leading-relaxed">
                      {highlight(snippet, q)}
                    </p>
                  )}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
