'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 带丝滑动画的关闭处理
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setTocOpen(false);
      setIsClosing(false);
    }, 250); // 与 CSS 动画时长匹配
  };

  const handleOpen = () => {
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

  return (
    <>
      {/* 右下角悬浮按钮组 */}
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

      {/* 移动端 Ins 风 Bottom Sheet 抽屉 */}
      {tocOpen && (
        <div
          className={`fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 ${
            isClosing ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleClose}
        >
          <div
            className={`w-full max-w-lg max-h-[65vh] flex flex-col rounded-t-[32px] bg-white/75 backdrop-blur-2xl border-t border-white/60 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out transform ${
              isClosing ? 'translate-y-full' : 'translate-y-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. 顶部手势 Drag Handle（点击亦可关闭） */}
            <div 
              onClick={handleClose}
              className="w-full py-3 flex items-center justify-center cursor-pointer active:opacity-60 transition-opacity"
            >
              <div className="w-12 h-1.5 rounded-full bg-black/20" />
            </div>

            {/* 2. 抽屉 Title：韩系 Ins 极简风 */}
            <div className="flex items-center justify-between px-6 pb-3 border-b border-black/[0.05]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-black/30 tracking-widest">✦.ﾟ</span>
                <h4 className="text-xs font-serif tracking-[0.2em] text-black/60 uppercase font-medium">
                  INDEX
                </h4>
              </div>
              <span className="text-[10px] text-black/30 font-serif italic">.♡ *</span>
            </div>

            {/* 3. 目录列表（可优雅滚动） */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTocClick(item.id)}
                  className={`group flex items-center gap-2 text-left py-2 transition-all duration-200 active:scale-[0.98] ${
                    item.level === 3
                      ? 'pl-5 text-xs text-black/50 hover:text-black/80'
                      : 'text-sm font-medium text-black/75 hover:text-black'
                  }`}
                >
                  <span className={`text-[10px] transition-colors ${item.level === 3 ? 'text-black/20 group-hover:text-black/60' : 'text-black/30 group-hover:text-black/70'}`}>
                    {item.level === 3 ? '.ﾟ*' : '✦'}
                  </span>
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
