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
      {/* 注入自定义字体 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @font-face {
          font-family: 'NameFont';
          src: url('https://a.tuchuangyun.top/autoupload/XpaunVhfV7QakiRQCrbgNdiO_OyvX7mIgxFBfDMDErs/20260721/Q5JE/Distant_Stroke_Medium.otf') format('opentype');
        }
        @font-face {
          font-family: 'BioFont';
          src: url('https://a.tuchuangyun.top/autoupload/XpaunVhfV7QakiRQCrbgNdiO_OyvX7mIgxFBfDMDErs/20260624/4rx3/KBIZmjo__M.ttf') format('truetype');
        }
      `}} />

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

      {/* 侧边栏容器 */}
      <div 
        className={`fixed inset-0 z-[60] sm:hidden transition-opacity duration-300 ease-in-out ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* 背景遮罩 */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
          onClick={() => setDrawerOpen(false)} 
        />
        
        {/* 半透明玻璃质感侧边栏 */}
        <div 
          className={`absolute top-0 right-0 h-full w-72 bg-[#F3FBFF]/70 backdrop-blur-xl p-6 shadow-2xl border-l border-white/40 overflow-y-auto transform transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="text-center mb-10 pt-8">
            {/* 恢复拍立得风格相框 */}
            {profile?.avatar_url && (
              <div className="inline-block bg-white p-2 pb-5 shadow-md rotate-[-2deg] mb-4 rounded-sm transition-transform hover:rotate-0 duration-300">
                <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover" />
              </div>
            )}
            
            {/* 名字 */}
            {profile?.nickname && (
              <h3 
                className="text-2xl mb-2 text-slate-800 tracking-wide font-medium" 
                style={{ fontFamily: 'NameFont, serif' }}
              >
                {profile.nickname}
              </h3>
            )}
            
            {/* 高级 INS 风签名 */}
            {profile?.bio && (
              <p 
                className="text-xs text-slate-500/80 leading-relaxed px-3 tracking-wider font-light" 
                style={{ fontFamily: 'BioFont, sans-serif' }}
              >
                {profile.bio}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3.5">
            {/* 玻璃质感韩系 INS 按钮 */}
            <Link
              href="/guestbook"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-sm text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <FiMessageSquare size={16} /> 留言板
            </Link>
            <Link
              href="/links"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-sm text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <FiLink2 size={16} /> 链接
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
