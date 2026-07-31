'use client';

import { useEffect, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false); // 默认收起小标题

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    // 平滑锚点跳转
    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-xs transition-all duration-300">
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* 大标题按键：点击展开/收起 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-black/60 group-hover:scale-125 transition-transform" />
            <span className="text-sm font-serif tracking-wider text-black/80 font-medium">
              目录 <span className="text-[10px] font-sans tracking-normal opacity-40 uppercase ml-1">Index</span>
            </span>
          </div>

          <FiChevronDown
            size={16}
            className={`text-black/40 transition-transform duration-300 ${
              isOpen ? 'rotate-180 text-black/80' : ''
            }`}
          />
        </button>

        {/* 展开的目录列表 */}
        {isOpen && (
          <div className="px-5 pb-4 pt-1 border-t border-black/5 flex flex-col gap-1 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  className={`group/item flex items-center gap-3 py-1.5 text-xs transition-all ${
                    item.level === 3 ? 'pl-4' : 'pl-0'
                  } ${
                    isActive
                      ? 'text-black font-semibold'
                      : 'text-black/50 hover:text-black/90 font-normal'
                  }`}
                >
                  {/* 左侧 Ins 感细线小圆点标记 */}
                  <span
                    className={`w-1 h-1 rounded-full transition-all ${
                      isActive
                        ? 'bg-black scale-125'
                        : 'bg-black/20 group-hover/item:bg-black/40'
                    }`}
                  />
                  <span className="line-clamp-1 tracking-wide">{item.text}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
