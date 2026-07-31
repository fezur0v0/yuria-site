'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

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
    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl shadow-sm p-4 sm:p-6"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.7))' }}
      >
        <h4 className="text-sm font-serif mb-3 text-black/70">目录</h4>
        <p className="text-xs text-black/30">这篇文章还没有小标题~</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl shadow-sm p-4 sm:p-6 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.7))',
        scrollbarWidth: 'none',
      }}
    >
      <h4 className="text-sm font-serif mb-3 text-black/70">目录</h4>
      <div className="relative flex flex-col gap-0.5">
        <div className="absolute left-[3px] top-1 bottom-1 w-px bg-black/10" />
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={`relative flex items-center gap-2.5 py-1.5 text-xs transition-colors ${
                item.level === 3 ? 'pl-6' : 'pl-0'
              } ${isActive ? 'text-black font-medium' : 'text-black/45 hover:text-black/75'}`}
            >
              <span
                className={`relative z-10 flex-shrink-0 rounded-full transition-all ${
                  item.level === 2 ? 'w-[7px] h-[7px]' : 'w-[5px] h-[5px] ml-1'
                } ${isActive ? 'bg-[#70B0CC]' : 'bg-black/20'}`}
              />
              <span className="line-clamp-1">{item.text}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
