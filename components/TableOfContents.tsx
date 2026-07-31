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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // 重构成树状结构（H2 包含 H3）
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

  // 监听页面滚动
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

  // 滚动到子标题时自动展开父级 H2
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
    
    // 1. 点击 H2 区域直接切换该项的展开/收起状态
    setExpandedIds((prev) => ({ ...prev, [group.id]: !prev[group.id] }));

    // 2. 跳转到对应位置
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
    <nav className="w-full max-w-xs font-sans select-none">
      {/* 彻底去除背景框，采用极简悬浮布局 */}
      <div className="p-2 space-y-4">
        {/* 韩系杂志风格的精致 Title */}
        <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06]">
          <span className="text-[10px] text-black/30 tracking-widest">✦.ﾟ</span>
          <h4 className="text-xs font-serif tracking-[0.25em] text-black/50 uppercase font-medium">
            INDEX
          </h4>
          <span className="text-[10px] text-black/20 font-serif italic ml-auto">.♡ *</span>
        </div>

        {/* 目录主列表 */}
        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {groupedItems.map((group) => {
            const isGroupActive = activeId === group.id;
            const hasChildren = group.children.length > 0;
            const isExpanded = !!expandedIds[group.id];

            return (
              <div key={group.id} className="flex flex-col gap-1">
                {/* H2 大标题整块可点击 */}
                <div
                  onClick={(e) => handleTitleClick(group, e)}
                  className={`group flex items-center justify-between py-1.5 px-1 cursor-pointer transition-all duration-300 ${
                    isGroupActive
                      ? 'text-[#4A777A] font-semibold tracking-wider translate-x-1 [text-shadow:0_0_12px_rgba(74,119,122,0.2)]'
                      : 'text-black/60 hover:text-[#4A777A] hover:translate-x-1 font-normal tracking-wide'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {/* 微星星符号 ✦ */}
                    <span
                      className={`text-[10px] transition-all duration-300 flex-shrink-0 ${
                        isGroupActive
                          ? 'text-[#4A777A] scale-125 opacity-100'
                          : 'text-black/20 group-hover:text-[#4A777A] group-hover:opacity-100 opacity-0'
                      }`}
                    >
                      ✦
                    </span>
                    <span className="text-xs line-clamp-1">{group.text}</span>
                  </div>

                  {/* 右侧微型箭头 */}
                  {hasChildren && (
                    <span className="text-black/20 group-hover:text-[#4A777A] transition-colors flex-shrink-0">
                      <FiChevronRight
                        size={12}
                        className={`transition-transform duration-300 ${
                          isExpanded ? 'rotate-90 text-[#4A777A]' : ''
                        }`}
                      />
                    </span>
                  )}
                </div>

                {/* H3 子标题列表 */}
                {hasChildren && isExpanded && (
                  <div className="pl-5 border-l border-black/[0.06] flex flex-col gap-1.5 py-1 my-0.5 ml-2 transition-all">
                    {group.children.map((child) => {
                      const isChildActive = activeId === child.id;
                      return (
                        <a
                          key={child.id}
                          href={`#${child.id}`}
                          onClick={(e) => handleChildClick(child.id, e)}
                          className={`group/child flex items-center gap-2 py-1 text-[11px] transition-all duration-200 ${
                            isChildActive
                              ? 'text-[#4A777A] font-medium tracking-wide translate-x-0.5'
                              : 'text-black/40 hover:text-[#4A777A] hover:translate-x-0.5'
                          }`}
                        >
                          <span
                            className={`text-[8px] transition-all duration-200 flex-shrink-0 ${
                              isChildActive
                                ? 'text-[#4A777A] opacity-100'
                                : 'text-black/15 group-hover/child:text-[#4A777A] opacity-60'
                            }`}
                          >
                            .ﾟ*
                          </span>
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
