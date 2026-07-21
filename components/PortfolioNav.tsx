'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PortfolioSearch from '@/components/PortfolioSearch';
import { createClient } from '@/utils/supabase/client';
import { FiMoreHorizontal, FiMessageSquare, FiLink2 } from 'react-icons/fi';

interface Profile {
  avatar_url: string | null;
  nickname: string | null;
  bio: string | null;
}

export default function PortfolioNav() {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('site_settings')
      .select('avatar_url, nickname, bio')
      .single()
      .then(({ data }) => setProfile(data));
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

          <div className="hidden sm:flex items-center gap-6">
            <PortfolioSearch />
            <Link href="/guestbook" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition">
              <FiMessageSquare size={15} /> 留言板
            </Link>
            <Link href="/links" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition">
              <FiLink2 size={15} /> 链接
            </Link>
          </div>

          <div className="flex sm:hidden items-center gap-4">
            <PortfolioSearch />
            <button onClick={() => setDrawerOpen(true)} className="text-white">
              <FiMoreHorizontal size={20} />
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 bg-[#f4ecdc] p-6 shadow-xl overflow-y-auto">
            <div className="text-center mb-8 pt-4">
              {profile?.avatar_url && (
                <div className="inline-block bg-white p-2 pb-4 shadow-md rotate-[-2deg] mb-3">
                  <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover" />
                </div>
              )}
              {profile?.nickname && <h3 className="font-serif font-bold text-lg mb-1">{profile.nickname}</h3>}
              {profile?.bio && <p className="text-xs text-black/50 leading-relaxed px-2">{profile.bio}</p>}
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/guestbook"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-white/60 border border-black/10 shadow-sm rotate-[-1deg] text-sm text-black/70 hover:bg-white/80 transition"
              >
                <FiMessageSquare size={15} /> 留言板
              </Link>
              <Link
                href="/links"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-white/60 border border-black/10 shadow-sm rotate-[1deg] text-sm text-black/70 hover:bg-white/80 transition"
              >
                <FiLink2 size={15} /> 链接
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
