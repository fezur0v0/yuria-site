'use client';

import { useEffect, useState, useMemo } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface GroupedTocItem {
  id: string;
  text: string;
  children: TocItem[];
}

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const groupedItems = useMemo(() => {
    const result: GroupedTocItem[] = [];
    let currentH2: GroupedTocItem | null = null;

    items.forEach((item) => {
      if (item.level === 2) {
        currentH2 = { id: item.id, text: item.text, children: [] };
        result.push(currentH2);
      } else if (item.level === 3) {
        if (currentH2) {
          currentH2.children.push(item);
        } else {
          result.push({ id: item.id, text: item.text, children: [] });
        }
      }
    });

    return result;
  }, [items]);

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

  useEffect(() => {
    if (!activeId) return;
    groupedItems.forEach((group) => {
      if (group.children.some((child) => child.id === activeId)) {
        setExpandedIds((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [activeId, groupedItems]);

  const handleTitleClick = (group: GroupedTocItem, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedIds((prev) => ({ ...prev, [group.id]: !prev[group.id] }));

    const el = document.getElementById(group.id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const handleChildClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <nav className="w-full font-sans select-none">
      {/* 保持和 SidebarProfile 相同的卡片外框 */}
      <div className="bg-white/60 backdrop-blur-md isolate transform-gpu rounded-2xl shadow-sm p-6 sm:p-7">
        
        {/* 标题区：极简 Ins 风格，将顶部所有符号统一改为了 ✦ */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-black/40">✦</span>
            <h4 className="text-xs font-serif tracking-[0.25em] text-black/70 uppercase font-medium">
              INDEX
            </h4>
          </div>
          <span className="text-[10px] text-black/30 font-serif">✦</span>
        </div>

        {/* 目录主列表 */}
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {groupedItems.map((group) => {
            const isGroupActive = activeId === group.id;
            const hasChildren = group.children.length > 0;
            const isExpanded = !!expandedIds[group.id];

            return (
              <div key={group.id} className="flex flex-col gap-1">
                {/* H2 大标题：极简轻盈样式 */}
                <div
                  onClick={(e) => handleTitleClick(group, e)}
                  className={`group flex items-center justify-between py-1.5 cursor-pointer transition-all duration-300 ${
                    isGroupActive
                      ? 'text-black font-medium tracking-wide translate-x-1'
                      : 'text-black/50 hover:text-black/80 hover:translate-x-1 font-normal tracking-wide'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {/* 左侧极其细小的黑/灰圆点，高亮时微扩大 */}
                    <span
                      className={`w-1 h-1 rounded-full transition-all duration-300 flex-shrink-0 ${
                        isGroupActive
                          ? 'bg-black scale-125'
                          : 'bg-black/20 group-hover:bg-black/40'
                      }`}
                    />
                    <span className="text-xs line-clamp-1">{group.text}</span>
                  </div>

                  {/* 右侧微型箭头 */}
                  {hasChildren && (
                    <span className="text-black/30 group-hover:text-black/60 transition-colors flex-shrink-0">
                      <FiChevronDown
                        size={13}
                        className={`transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-black/70' : ''
                        }`}
                      />
                    </span>
                  )}
                </div>

                {/* H3 子标题列表：去掉小符号，换用极简的侧边细线指示 */}
                {hasChildren && isExpanded && (
                  <div className="pl-3.5 border-l border-black/10 flex flex-col gap-1 py-1 my-0.5 ml-2 transition-all">
                    {group.children.map((child) => {
                      const isChildActive = activeId === child.id;
                      return (
                        <a
                          key={child.id}
                          href={`#${child.id}`}
                          onClick={(e) => handleChildClick(child.id, e)}
                          className={`flex items-center py-1 text-[11px] transition-all duration-200 ${
                            isChildActive
                              ? 'text-black font-medium tracking-wide translate-x-0.5'
                              : 'text-black/40 hover:text-black/70 hover:translate-x-0.5'
                          }`}
                        >
                          <span className="line-clamp-1">{child.text}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
