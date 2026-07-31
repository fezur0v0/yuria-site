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

  // 监听页面滚动高亮
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

  // 自动展开当前高亮子项对应的父级 H2
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
      {/* 彻底同步 SidebarProfile 的同款卡片样式 */}
      <div className="bg-white/60 backdrop-blur-md isolate transform-gpu rounded-2xl shadow-sm p-5 sm:p-6">
        {/* 卡片头部：韩系 Ins 杂志风 Title */}
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-black/5">
          <span className="text-[10px] text-black/30 tracking-widest">✦.ﾟ</span>
          <h4 className="text-xs font-serif tracking-[0.2em] text-black/60 uppercase font-medium">
            INDEX
          </h4>
          <span className="text-[10px] text-black/25 font-serif italic ml-auto">.♡ *</span>
        </div>

        {/* 目录列表 */}
        <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {groupedItems.map((group) => {
            const isGroupActive = activeId === group.id;
            const hasChildren = group.children.length > 0;
            const isExpanded = !!expandedIds[group.id];

            return (
              <div key={group.id} className="flex flex-col gap-1">
                {/* H2 大标题：点击整块区域收容/展开 */}
                <div
                  onClick={(e) => handleTitleClick(group, e)}
                  className={`group flex items-center justify-between py-1.5 px-1 rounded-lg cursor-pointer transition-all duration-300 ${
                    isGroupActive
                      ? 'text-[#2a6f78] font-semibold tracking-wide translate-x-1'
                      : 'text-black/70 hover:text-[#2a6f78] hover:translate-x-1 font-normal tracking-wide'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={`text-[10px] transition-all duration-300 flex-shrink-0 ${
                        isGroupActive
                          ? 'text-[#2a6f78] scale-125 opacity-100'
                          : 'text-black/20 group-hover:text-[#2a6f78] group-hover:opacity-100 opacity-0'
                      }`}
                    >
                      ✦
                    </span>
                    <span className="text-sm line-clamp-1">{group.text}</span>
                  </div>

                  {/* 折叠小箭头 */}
                  {hasChildren && (
                    <span className="text-black/30 group-hover:text-[#2a6f78] transition-colors flex-shrink-0">
                      <FiChevronDown
                        size={14}
                        className={`transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-[#2a6f78]' : ''
                        }`}
                      />
                    </span>
                  )}
                </div>

                {/* H3 子标题列表 */}
                {hasChildren && isExpanded && (
                  <div className="pl-4 border-l border-black/10 flex flex-col gap-1 py-1 my-0.5 ml-2.5 transition-all">
                    {group.children.map((child) => {
                      const isChildActive = activeId === child.id;
                      return (
                        <a
                          key={child.id}
                          href={`#${child.id}`}
                          onClick={(e) => handleChildClick(child.id, e)}
                          className={`group/child flex items-center gap-2 py-1 text-xs transition-all duration-200 ${
                            isChildActive
                              ? 'text-[#2a6f78] font-medium tracking-wide translate-x-0.5'
                              : 'text-black/50 hover:text-[#2a6f78] hover:translate-x-0.5'
                          }`}
                        >
                          <span
                            className={`text-[9px] transition-all duration-200 flex-shrink-0 ${
                              isChildActive
                                ? 'text-[#2a6f78] opacity-100'
                                : 'text-black/20 group-hover/child:text-[#2a6f78] opacity-60'
                            }`}
                          >
                          ✦
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
