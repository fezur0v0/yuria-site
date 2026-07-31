'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PiArrowCircleUp, PiGearSix, PiListBullets, PiX } from 'react-icons/pi';

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

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setTocOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {tocItems.length > 0 && (
          <button
            onClick={() => setTocOpen(true)}
            className="lg:hidden w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl shadow-lg flex items-center justify-center text-black/70 hover:text-black hover:bg-white/35 transition"
            title="目录"
          >
            <PiListBullets size={20} />
          </button>
        )}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl shadow-lg flex items-center justify-center text-black/70 hover:text-black hover:bg-white/35 transition"
            title="回到顶部"
          >
            <PiArrowCircleUp size={20} />
          </button>
        )}
        <Link
          href="/admin/portfolio"
          className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl shadow-lg flex items-center justify-center text-black/70 hover:text-black hover:bg-white/35 transition"
          title="设置"
        >
          <PiGearSix size={20} />
        </Link>
      </div>

      {tocOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setTocOpen(false)}
        >
          <div
            className="w-full sm:w-96 max-h-[70vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white/70 backdrop-blur-xl shadow-2xl p-6 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-serif text-black/80">目录</h4>
              <button onClick={() => setTocOpen(false)} className="text-black/40 hover:text-black transition">
                <PiX size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTocClick(item.id)}
                  className={`text-left py-2 text-sm text-black/60 hover:text-black transition line-clamp-1 ${
                    item.level === 3 ? 'pl-5 text-xs text-black/45' : ''
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
