'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { PiArrowCircleUp, PiGearSix, PiListBullets } from 'react-icons/pi';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function FloatingWidget({ tocItems = [] }: { tocItems?: TocItem[] }) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // 记录当前展开的 H2 id
  const [openH2, setOpenH2] = useState<string | null>(null);

  // 手势拖拽状态
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

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
    const firstH2 = tocItems.find((i) => i.level === 2);
    setOpenH2(firstH2 ? firstH2.id : null);
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

  // 拖拽手势
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) setDragY(deltaY);
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 80) handleClose();
    else setDragY(0);
  };

  // H2 / H3 数据分组
  const groupedToc = tocItems.reduce<{ h2: TocItem; children: TocItem[] }[]>((acc, item) => {
    if (item.level === 2) acc.push({ h2: item, children: [] });
    else if (acc.length > 0) acc[acc.length - 1].children.push(item);
    return acc;
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {tocItems.length > 0 && (
          <button
            onClick={handleOpen}
            className="lg:hidden w-11 h-11 rounded-full bg-slate-900/45 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20 flex items-center justify-center text-white hover:scale-105 hover:bg-slate-900/80 hover:border-white/40 active:scale-95 transition-all duration-300"
            title="目录"
          >
            <PiListBullets size={20} />
          </button>
        )}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-11 h-11 rounded-full bg-slate-900/45 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20 flex items-center justify-center text-white hover:scale-105 hover:bg-slate-900/80 hover:border-white/40 active:scale-95 transition-all duration-300"
            title="回到顶部"
          >
            <PiArrowCircleUp size={20} />
          </button>
        )}
        <Link
          href="/admin/portfolio"
          className="w-11 h-11 rounded-full bg-slate-900/45 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20 flex items-center justify-center text-white hover:scale-105 hover:bg-slate-900/80 hover:border-white/40 active:scale-95 transition-all duration-300"
          title="设置"
        >
          <PiGearSix size={20} />
        </Link>
      </div>

      {tocOpen && (
        <div
          className={`fixed inset-0 z-50 bg-black/25 backdrop-blur-sm flex items-end justify-center transition-opacity duration-200 ${
            isClosing ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleClose}
        >
          <div
            className={`w-full max-w-lg max-h-[60vh] flex flex-col rounded-t-[32px] bg-white/80 backdrop-blur-2xl border-t border-white/60 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] ${
              isDragging ? '' : 'transition-transform duration-200 ease-out'
            } ${isClosing ? 'translate-y-full' : ''}`}
            style={{ transform: !isClosing ? `translateY(${dragY}px)` : undefined }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部的拖拽手势指示条 */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleClose}
              className="w-full py-3.5 flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1.5 rounded-full bg-black/20" />
            </div>

            {/* 标题 */}
            <div className="flex items-center justify-center gap-2 pb-3 mx-6 border-b border-black/[0.05]">
              <span className="text-[10px] text-black/30">✦</span>
              <h4 className="text-xs font-serif tracking-[0.25em] text-black/60 uppercase font-medium">
                INDEX
              </h4>
              <span className="text-[10px] text-black/30">✦</span>
            </div>

            {/* 目录内容区 */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center gap-2.5 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {groupedToc.map(({ h2, children }) => {
                const isOpen = openH2 === h2.id;
                const hasChildren = children.length > 0;

                return (
                  <div key={h2.id} className="w-full flex flex-col items-center">
                    {/* H2 标题块：展开时带有特有的柔和阴影与白底 */}
                    <div
                      onClick={() => {
                        if (hasChildren) {
                          setOpenH2(isOpen ? null : h2.id);
                        } else {
                          handleTocClick(h2.id);
                        }
                      }}
                      className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 border ${
                        isOpen
                          ? 'bg-white/80 border-black/5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] text-black/90 font-medium'
                          : 'border-transparent text-black/60 hover:text-black/80 hover:bg-black/[0.03]'
                      }`}
                    >
                      <span className="text-sm tracking-wide text-center line-clamp-1">
                        {h2.text}
                      </span>
                    </div>

                    {/* H3 子章节：折叠动画 */}
                    {hasChildren && (
                      <div
                        className={`w-full flex flex-col items-center overflow-hidden transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-96 opacity-100 py-1.5 gap-1' : 'max-h-0 opacity-0'
                        }`}
                      >
                        {children.map((h3) => (
                          <button
                            key={h3.id}
                            onClick={() => handleTocClick(h3.id)}
                            className="w-full py-1.5 text-center text-xs text-black/45 hover:text-black/80 transition-all active:scale-95"
                          >
                            <span className="line-clamp-1">{h3.text}</span>
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
