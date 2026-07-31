'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { PiArrowCircleUp, PiGearSix, PiListBullets } from 'react-icons/pi';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface FloatingWidgetProps {
  tocItems?: TocItem[];
}

export default function FloatingWidget({ tocItems = [] }: FloatingWidgetProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // 手势拖拽相关状态
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

  // 1. 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
  };

  // 2. 触摸移动（跟手拖拽）
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      // 只能向下拖拽
      setDragY(deltaY);
    }
  };

  // 3. 触摸松开（判断是弹回还是关闭）
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 80) {
      // 拖拽超过 80px，自然关闭
      handleClose();
    } else {
      // 没超过，弹回顶部
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

      {/* 移动端 Ins 风可拖拽 Bottom Sheet */}
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
            style={{
              transform: !isClosing ? `translateY(${dragY}px)` : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 可上下拖拽区域（带有 iOS 手势指示条） */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleClose}
              className="w-full py-3.5 flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1.5 rounded-full bg-black/20" />
            </div>

            {/* Title 区域：完全居中 */}
            <div className="flex items-center justify-center gap-2 pb-3 mx-6 border-b border-black/[0.05]">
              <span className="text-[10px] text-black/30">✦</span>
              <h4 className="text-xs font-serif tracking-[0.25em] text-black/60 uppercase font-medium">
                INDEX
              </h4>
              <span className="text-[10px] text-black/30">✦</span>
            </div>

            {/* 目录列表：文字居中排版 */}
            <div
              className="flex-1 overflow-y-auto px-6 py-5 flex flex-col items-center gap-3 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTocClick(item.id)}
                  className={`w-full text-center py-1 transition-all duration-200 active:scale-95 ${
                    item.level === 3
                      ? 'text-xs text-black/45 font-normal tracking-wide'
                      : 'text-sm text-black/85 font-medium tracking-wide'
                  }`}
                >
                  <span className="line-clamp-1">{item.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
