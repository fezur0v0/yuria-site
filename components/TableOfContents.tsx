'use client';

import { useEffect, useState, useMemo } from 'react';
import { FiChevronRight } from 'react-icons/fi';

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
  // 记录哪些一级标题（H2）是展开状态
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // 将扁平的 items 结构重构成树状结构（H2 包含 H3）
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
          // 如果前面没有 H2，单独作为顶级项处理
          result.push({ id: item.id, text: item.text, children: [] });
        }
      }
    });

    return result;
  }, [items]);

  // 监听页面滚动，高亮当前标题
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
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

  // 当滚动高亮到某个子标题时，自动展开其所在的父级 H2
  useEffect(() => {
    if (!activeId) return;
    groupedItems.forEach((group) => {
      if (group.children.some((child) => child.id === activeId)) {
        setExpandedIds((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [activeId, groupedItems]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (items.length === 0) return null;

  return (
    <nav className="w-full max-w-xs font-sans">
      <div className="rounded-3xl border border-black/[0.04] bg-white/70 backdrop-blur-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
        {/* 卡片头部标题 */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04]">
          <h4 className="text-xs font-serif tracking-[0.2em] text-black/40 uppercase font-medium">
            Contents
          </h4>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3182ce]/60" />
        </div>

        {/* 目录分组列表 */}
        <div className="flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {groupedItems.map((group) => {
            const isGroupActive = activeId === group.id;
            const hasChildren = group.children.length > 0;
            const isExpanded = !!expandedIds[group.id];

            return (
              <div key={group.id} className="flex flex-col gap-1">
                {/* 大标题 (H2) */}
                <div
                  onClick={(e) => handleClick(e, group.id)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs tracking-wide transition-all duration-300 cursor-pointer ${
                    isGroupActive
                      ? 'bg-white text-[#3182ce] font-semibold shadow-[0_4px_14px_rgba(49,130,206,0.15)] -translate-y-[1px]'
                      : 'text-black/70 hover:text-[#3182ce] hover:bg-white/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-[1px]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <span
                      className={`w-1 h-1 rounded-full transition-all duration-300 flex-shrink-0 ${
                        isGroupActive
                          ? 'bg-[#3182ce] scale-125'
                          : 'bg-black/20 group-hover:bg-[#3182ce]'
                      }`}
                    />
                    <span className="line-clamp-1">{group.text}</span>
                  </div>

                  {/* 如果有子标题，展示小折叠箭头 */}
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={(e) => toggleExpand(group.id, e)}
                      className="p-1 rounded-lg text-black/30 hover:text-[#3182ce] hover:bg-black/5 transition-all flex-shrink-0"
                    >
                      <FiChevronRight
                        size={13}
                        className={`transition-transform duration-300 ${
                          isExpanded ? 'rotate-90 text-[#3182ce]' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* 子标题列表 (H3) — 只有展开时显示 */}
                {hasChildren && isExpanded && (
                  <div className="pl-4 ml-3 border-l border-black/[0.06] flex flex-col gap-1 py-1 my-0.5">
                    {group.children.map((child) => {
                      const isChildActive = activeId === child.id;
                      return (
                        <a
                          key={child.id}
                          href={`#${child.id}`}
                          onClick={(e) => handleClick(e, child.id)}
                          className={`group/child flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] tracking-wide transition-all duration-200 ${
                            isChildActive
                              ? 'bg-white text-[#3182ce] font-medium shadow-[0_2px_8px_rgba(49,130,206,0.12)] -translate-y-[0.5px]'
                              : 'text-black/50 hover:text-[#3182ce] hover:bg-white/60 hover:shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full transition-all duration-200 flex-shrink-0 ${
                              isChildActive
                                ? 'bg-[#3182ce]'
                                : 'bg-black/15 group-hover/child:bg-[#3182ce]'
                            }`}
                          />
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
