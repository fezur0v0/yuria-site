'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function PortfolioNav() {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      setScrolled(currentY > 40);

      if (currentY > lastScrollY.current && currentY > 80) {
        setVisible(false); // 往下滑，藏起来
      } else if (currentY < lastScrollY.current) {
        setVisible(true); // 往上滑一点，立刻出现
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${scrolled ? 'bg-black/30 backdrop-blur-md' : 'bg-transparent'}`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        <Link href="/" className="text-white font-serif text-lg tracking-wide">
          yuria
        </Link>
      </div>
    </nav>
  );
}
