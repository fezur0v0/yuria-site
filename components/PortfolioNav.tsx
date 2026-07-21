'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PortfolioSearch from '@/components/PortfolioSearch';

export default function PortfolioNav() {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);
      if (currentY > lastScrollY.current && currentY > 80) {
        setVisible(false);
      } else if (currentY < lastScrollY.current) {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          visible ? 'translate-y-0' : '-translate-y-full'
        } ${scrolled ? 'bg-black/30 backdrop-blur-md' : 'bg-transparent'}`}
      >
        <div className="px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-white font-serif text-lg tracking-wide">
            yuria
          </Link>

          <div className="hidden sm:flex items-center gap-5">
            <PortfolioSearch />
            <Link href="/guestbook" className="text-sm text-white/80 hover:text-white transition">
              留言板
            </Link>
            <button className="text-white/80 hover:text-white transition" title="明暗切换(开发中)">
              ☀
            </button>
            <Link href="/links" className="text-sm text-white/80 hover:text-white transition">
              链接
            </Link>
          </div>

          <div className="flex sm:hidden items-center gap-3">
            <PortfolioSearch />
            <button onClick={() => setDrawerOpen(true)} className="text-white text-sm">
              更多
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-64 bg-white p-6 shadow-xl flex flex-col gap-4">
            <button onClick={() => setDrawerOpen(false)} className="self-end text-black/40 text-xl mb-4">
              ×
            </button>
            <Link href="/guestbook" onClick={() => setDrawerOpen(false)} className="text-black/70 hover:text-black transition">
              留言板
            </Link>
            <button className="text-left text-black/70 hover:text-black transition">明暗切换(开发中)</button>
            <Link href="/links" onClick={() => setDrawerOpen(false)} className="text-black/70 hover:text-black transition">
              链接
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
