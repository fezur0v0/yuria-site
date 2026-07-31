'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { PiArrowCircleUp, PiGearSix, PiListBullets, PiCaretDownBold } from 'react-icons/pi';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface FloatingWidgetProps {
  tocItems?: TocItem[];
}

// 整理成层级树结构的数据类型
interface SectionGroup {
  h2Item: TocItem;
  h3Items: TocItem[];
}

export default function FloatingWidget({ tocItems = [] }: FloatingWidgetProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // 记录哪些 H2 是展开状态（默认全展开或折叠，这里默认全展开）
  const [expandedH2, setExpandedH2] = useState<Record<string, boolean>>({});

  // 手势拖拽相关状态
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  // 1. 将扁平的 tocItems 转成 H2 -> H3 的分组树形结构
  const groupedSections: SectionGroup[] = [];
  let currentGroup: SectionGroup | null = null;

  tocItems.forEach((item) => {
    if (item.level === 2) {
      currentGroup = { h2Item: item, h3Items: [] };
      groupedSections.push(currentGroup);
    } else if (item.level === 3) {
      if (currentGroup) {
        currentGroup.h3Items.push(item);
      } else {
        // 万一没有前置 H2，也单拉出一个虚拟组
        groupedSections.push({ h2Item: { id: item.id, text: item.text, level: 2 }, h3Items: [] });
      }
    }
  });

  // 当目录打开时，默认把所有 H2 初始化为展开状态
  useEffect(() => {
    if (tocOpen) {
      const initialStates: Record<string, boolean> = {};
      groupedSections.forEach((group) => {
        initialStates[group.h2Item.id] = true;
      });
      setExpandedH2(initialStates);
    }
  }, [tocOpen]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setTocOpen(false);
      setIsClosing(false);
      setDragY(0);
    }, 200);
  };

  const handleOpen = () => {
    setDragY(0);
    setTocOpen(true);
  };

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    handleClose();
  };

  // 切换 H2 的展开/折叠
  const toggleH2 = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedH2((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 2. 触摸手势控制
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 80) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <>
      {/* 悬浮按钮组 */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {tocItems.length > 0 && (
          <button
            onClick={handleOpen}
            className="lg:hidden w-11 h-11 rounded-full bg-white/40 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-white/50 flex items-center justify-center text-black/70 hover:text-black active:scale-95 transition-all"
            title="目录"
          >
            <PiListBullets size={20} />
          </button>
        )}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-11 h-11 rounded-full bg-white/40 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-white/50 flex items-center justify-center text-black/70 hover:text-black active:scale-95 transition-all"
            title="回到顶部"
          >
            <PiArrowCircleUp size={20} />
          </button>
        )}
        <Link
          href="/admin/portfolio"
          className="w-11 h-11 rounded-full bg-white/40 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-white/50 flex items-center justify-center text-black/70 hover:text-black active:scale-95 transition-all"
          title="设置"
        >
          <PiGearSix size={20} />
        </Link>
      </div>

      {/* 移动端 Ins 风可折叠 Bottom Sheet */}
      {tocOpen && (
        <div
          className={`fixed inset-0 z-50 bg-black/25 backdrop-blur-sm flex items-end justify-center transition-opacity duration-200 ${
            isClosing ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleClose}
        >
          <div
            className={`w-full max-w-lg max-h-[65vh] flex flex-col rounded-t-[32px] bg-white/80 backdrop-blur-2xl border-t border-white/60 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] ${
              isDragging ? '' : 'transition-transform duration-200 ease-out'
            } ${isClosing ? 'translate-y-full' : ''}`}
            style={{
              transform: !isClosing ? `translateY(${dragY}px)` : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部分享/拖拽手势区 */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleClose}
              className="w-full py-3.5 flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1.5 rounded-full bg-black/20" />
            </div>

            {/* 标头居中 */}
            <div className="flex items-center justify-center gap-2 pb-3 mx-6 border-b border-black/[0.05]">
              <span className="text-[10px] text-black/30">✦</span>
              <h4 className="text-xs font-serif tracking-[0.25em] text-black/60 uppercase font-medium">
                INDEX
              </h4>
              <span className="text-[10px] text-black/30">✦</span>
            </div>

            {/* 可折叠目录树 */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center gap-3 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {groupedSections.map((group) => {
                const isExpanded = expandedH2[group.h2Item.id] ?? true;
                const hasChildren = group.h3Items.length > 0;

                return (
                  <div key={group.h2Item.id} className="w-full flex flex-col items-center">
                    {/* H2 主标题行：点击可跳转，如果有子标题点击右侧小指示器可折叠 */}
                    <div className="relative w-full flex items-center justify-center py-1.5">
                      <button
                        onClick={() => handleTocClick(group.h2Item.id)}
                        className="text-sm text-black/85 font-medium tracking-wide transition-all active:scale-95 text-center px-6 line-clamp-1"
                      >
                        {group.h2Item.text}
                      </button>

                      {/* 折叠小箭头指示器 */}
                      {hasChildren && (
                        <button
                          onClick={(e) => toggleH2(group.h2Item.id, e)}
                          className="absolute right-2 p-1 text-black/30 hover:text-black/60 transition-all rounded-full"
                          title={isExpanded ? '折叠' : '展开'}
                        >
                          <PiCaretDownBold
                            size={12}
                            className={`transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : 'rotate-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* H3 子标题列表（展开/折叠过渡） */}
                    {hasChildren && isExpanded && (
                      <div className="w-full flex flex-col items-center gap-2 py-1 transition-all duration-200">
                        {group.h3Items.map((h3) => (
                          <button
                            key={h3.id}
                            onClick={() => handleTocClick(h3.id)}
                            className="w-full text-center text-xs text-black/45 hover:text-black/75 font-normal tracking-wide transition-all active:scale-95 py-0.5 line-clamp-1"
                          >
                            {h3.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
