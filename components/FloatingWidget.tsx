'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function FloatingWidget() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-11 h-11 rounded-full bg-white/80 backdrop-blur-md shadow-md flex items-center justify-center text-black/60 hover:text-black hover:bg-white transition"
          title="回到顶部"
        >
          ↑
        </button>
      )}
      <Link
        href="/admin/portfolio"
        className="w-11 h-11 rounded-full bg-white/80 backdrop-blur-md shadow-md flex items-center justify-center text-black/60 hover:text-black hover:bg-white transition"
        title="设置"
      >
        ⚙
      </Link>
    </div>
  );
}
