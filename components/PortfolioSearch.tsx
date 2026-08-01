'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Item {
  id: string;
  title: string;
  content: string | null;
}

// 模拟图标，替代外部 icon 依赖以保障编译兼容
function SearchIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// 剔除标题标签与 HTML 格式
function stripHtml(html: string) {
  if (!html) return '';
  return html
    .replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// 搜索匹配高亮
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

// 默认预设数据，确保本地与线上渲染不崩溃
const DEFAULT_ITEMS: Item[] = [
  { id: '1', title: '关于设计系统的思考与实践', content: '<h2>引言</h2><p>设计系统是连接产品、设计与工程的桥梁...</p>' },
  { id: '2', title: '日系极简风格网页 UI 研讨', content: '<h2>风格探讨</h2><p>追求质感与留白，结合清透磨砂玻璃视觉...</p>' },
  { id: '3', title: '摄影集：夏日海浪与晨光记录', content: '<h2>影集</h2><p>若能与你共乘海浪之上，记录极光与晨曦...</p>' },
];

export function PortfolioSearch() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 尝试安全加载 supabase 客户端数据
  useEffect(() => {
    try {
      // 动态判断防编译报错
      const supabaseModule = require('@/utils/supabase/client');
      if (supabaseModule && supabaseModule.createClient) {
        const supabase = supabaseModule.createClient();
        supabase
          .from('portfolio_items')
          .select('id, title, content')
          .then(({ data }: { data: Item[] | null }) => {
            if (data && data.length > 0) setItems(data);
          })
          .catch(() => {});
      }
    } catch (e) {
      // 在无 Next.js 上下文预览时回退使用示例数据
    }
  }, []);

  // 点击外部关闭搜索框
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
      className="relative flex items-center justify-center p-4"
    >
      {/* 搜索框胶囊容器：收起时采用柔和延长的 cubic-bezier 曲线，自然舒缓 */}
      <div
        onClick={handleOpen}
        className={`flex items-center rounded-full border cursor-pointer select-none ${
          expanded
            ? 'w-56 px-3.5 py-1.5 bg-white/35 border-white/60 backdrop-blur-md shadow-[0_4px_20px_rgba(255,255,255,0.15)] duration-300'
            : 'w-9 h-9 p-0 bg-white/0 border-transparent justify-center duration-500'
        }`}
        style={{
          transitionProperty: 'width, padding, background-color, border-color, box-shadow',
          transitionTimingFunction: expanded
            ? 'cubic-bezier(0.16, 1, 0.3, 1)'
            : 'cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* 左侧白色图标：保持居左并轻微平移 */}
        <SearchIcon
          size={16}
          className={`shrink-0 text-white transition-all duration-300 ${
            expanded ? 'mr-2 opacity-90 scale-100' : 'opacity-100 scale-95'
          }`}
        />

        {/* 输入框包裹层：收起时快速淡出（opacity 200ms），防止文字收缩变形 */}
        <div
          className={`overflow-hidden flex-1 flex items-center transition-all ${
            expanded
              ? 'w-full opacity-100 duration-300 ease-out'
              : 'w-0 opacity-0 duration-200 ease-in pointer-events-none'
          }`}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索"
            className="w-full bg-transparent text-white placeholder:text-white/70 text-sm outline-none border-none p-0 focus:ring-0"
          />
        </div>
      </div>

      {/* 搜索结果弹窗：中心轴对齐 + 响应式定位 */}
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
            shadow-[0_12px_30px_rgba(0,0,0,0.08)] 
            z-50 animate-in fade-in slide-in-from-top-2 duration-300 
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
                <a
                  key={item.id}
                  href={`/portfolio/${item.id}`}
                  onClick={() => {
                    setExpanded(false);
                    setQuery('');
                  }}
                  className="group block p-3 sm:p-2.5 rounded-xl hover:bg-black/5 active:scale-[0.98] transition-all duration-200 no-underline"
                >
                  <p className="text-xs font-semibold text-black/80 group-hover:text-black mb-0.5 line-clamp-1 transition-colors">
                    {highlight(item.title, q)}
                  </p>
                  {snippet && (
                    <p className="text-[11px] text-black/45 group-hover:text-black/65 line-clamp-1 leading-relaxed">
                      {highlight(snippet, q)}
                    </p>
                  )}
                </a>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-start justify-center pt-10">
      <PortfolioSearch />
    </div>
  );
}
