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
      {/* 动态引入自定义字体 */}
      <style jsx global>{`
        @font-face {
          font-family: 'CustomTitleFont';
          src: url('https://a.tuchuangyun.top/autoupload/XpaunVhfV7QakiRQCrbgNdiO_OyvX7mIgxFBfDMDErs/20260721/BsKr/NCLGasdrifo-Demo.otf') format('opentype');
          font-display: swap;
        }
        .font-custom {
          font-family: 'CustomTitleFont', sans-serif;
        }
        .font-songti {
          font-family: 'SimSun', 'Songti SC', 'STSong', serif;
        }
      `}</style>

      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          visible ? 'translate-y-0' : '-translate-y-full'
        } ${scrolled ? 'bg-black/30 backdrop-blur-md' : 'bg-transparent'}`}
      >
        <div className="px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-white font-custom text-xl tracking-wide">
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
          {/* 背景设为 #feffef */}
          <div className="absolute top-0 right-0 h-full w-72 bg-[#feffef] p-6 shadow-xl overflow-y-auto border-l-2 border-black">
            <div className="text-center mb-8 pt-4">
              {profile?.avatar_url && (
                <div className="inline-block bg-white p-2 pb-4 border-2 border-black shadow-[4px_4px_0px_#000] rotate-[-2deg] mb-3">
                  <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover border border-black/10" />
                </div>
              )}
              {/* 名字使用自定义字体 */}
              {profile?.nickname && (
                <h3 className="font-custom text-2xl mb-1 text-black font-normal">
                  {profile.nickname}
                </h3>
              )}
              {/* 简介使用宋体 */}
              {profile?.bio && (
                <p className="font-songti text-xs text-black/70 leading-relaxed px-2 mt-2">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* 拼贴风按钮 (Collage Style) */}
            <div className="flex flex-col gap-4">
              <Link
                href="/guestbook"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#fff] border-2 border-black shadow-[3px_3px_0px_#000] rotate-[-1.5deg] text-sm font-bold text-black hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
              >
                <FiMessageSquare size={16} /> 留言板
              </Link>
              <Link
                href="/links"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#ffe680] border-2 border-black shadow-[3px_3px_0px_#000] rotate-[1.5deg] text-sm font-bold text-black hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
              >
                <FiLink2 size={16} /> 链接
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
