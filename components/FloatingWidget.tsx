'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { PiArrowCircleUp, PiGearSix, PiListBullets, PiCaretDownBold } from 'react-icons/pi';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function FloatingWidget({ tocItems = [] }: { tocItems?: TocItem[] }) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // 记录当前展开的 H2 id（默认全部展开或展开第一个）
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
    // 默认展开第一个 H2
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

  // 拖拽手势处理
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

  // 将平铺的 tocItems 分组为 H2 和子项 H3
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
            {/* 可拖拽关闭指示条 */}
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

            {/* 可折叠目录列表 */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center gap-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {groupedToc.map(({ h2, children }) => {
                const isOpen = openH2 === h2.id;
                const hasChildren = children.length > 0;

                return (
                  <div key={h2.id} className="w-full flex flex-col items-center">
                    {/* 点击整个 H2 整行区域进行折叠/跳转 */}
                    <div
                      onClick={() => {
                        if (hasChildren) {
                          setOpenH2(isOpen ? null : h2.id);
                        } else {
                          handleTocClick(h2.id);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-black/5 active:scale-[0.98] transition-all"
                    >
                      <span className="text-sm text-black/85 font-medium tracking-wide text-center line-clamp-1">
                        {h2.text}
                      </span>
                      {hasChildren && (
                        <PiCaretDownBold
                          size={12}
                          className={`text-black/40 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </div>

                    {/* H3 子标题（折叠展示） */}
                    {hasChildren && (
                      <div
                        className={`w-full flex flex-col items-center overflow-hidden transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-96 opacity-100 py-1' : 'max-h-0 opacity-0'
                        }`}
                      >
                        {children.map((h3) => (
                          <button
                            key={h3.id}
                            onClick={() => handleTocClick(h3.id)}
                            className="w-full py-1.5 text-center text-xs text-black/50 hover:text-black/80 transition-all active:scale-95"
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
