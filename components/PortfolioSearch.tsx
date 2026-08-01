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
      <span className="text-[#70B0CC] font-semibold">{text.slice(idx, idx + query.length)}</span>
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

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
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
      onMouseEnter={() => {
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }}
      className="relative flex items-center"
    >
      {/* 搜索容器：点击/悬浮时图标向右移动，输入框在左侧展开 */}
      <div
        className={`flex items-center rounded-full border border-white/20 bg-black/15 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out overflow-hidden ${
          expanded ? 'w-60 pl-3.5 pr-1.5 py-1' : 'w-9 h-9 p-0 bg-transparent border-transparent backdrop-blur-none shadow-none justify-center'
        }`}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标题或内容…"
          className={`bg-transparent text-white placeholder:text-white/40 text-xs font-medium outline-none transition-all duration-300 ${
            expanded ? 'w-full opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        />

        {/* 搜索按钮：处于右侧 */}
        <button
          onClick={handleToggle}
          title="搜索"
          className={`w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-300 shrink-0 ${
            !expanded ? 'w-9 h-9 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20' : ''
          }`}
        >
          <FiSearch size={15} />
        </button>
      </div>

      {/* 搜索结果弹窗（绝美半透明磨砂质感卡片） */}
      {expanded && q && (
        <div
          className="absolute right-0 top-full mt-3 w-80 max-h-80 overflow-y-auto flex flex-col gap-1 p-2 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.25)] z-50 animate-in fade-in slide-in-from-top-2 duration-200 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {results.length === 0 ? (
            <p className="text-xs text-white/50 text-center py-6 font-medium tracking-wide">
              ✦ 未找到相关作品 ✦
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
                  className="group block p-3 rounded-xl hover:bg-white/15 active:bg-white/20 transition-all duration-200 border border-transparent hover:border-white/10"
                >
                  <p className="text-xs font-semibold text-white/90 group-hover:text-white mb-1 line-clamp-1 transition-colors">
                    {highlight(item.title, q)}
                  </p>
                  {snippet && (
                    <p className="text-[11px] text-white/45 group-hover:text-white/65 line-clamp-1 leading-relaxed">
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
