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

export default function PortfolioNav({ homeHref = '/', theme = 'default' }: { homeHref?: string; theme?: 'default' | 'light' }) {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const lastScrollY = useRef(0);
  const isLight = theme === 'light';
  const logoColor = isLight ? 'text-[#1a1a1a]' : 'text-white';
  const linkColor = isLight ? 'text-[#1a1a1a]/70 hover:text-[#1a1a1a]' : 'text-white/80 hover:text-white';
  const iconColor = isLight ? 'text-[#1a1a1a]' : 'text-white';
  const scrolledBg = isLight ? 'bg-white/50 backdrop-blur-md' : 'bg-black/30 backdrop-blur-md';
  
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
  className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${
    visible ? 'translate-y-0' : '-translate-y-full'
  }`}
>
  <div className={`transition-colors duration-300 ${scrolled ? scrolledBg : 'bg-transparent'}`}>
    <div className="px-8 h-16 flex items-center justify-between">
                   <Link href={homeHref} className={`${logoColor} font-serif text-lg tracking-wide`}>
            yuria
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <PortfolioSearch />
                   <Link href="/guestbook" className={`flex items-center gap-1.5 text-sm ${linkColor} transition-colors`}>
              <FiMessageSquare size={15} /> 留言板
            </Link>
            <Link href="/links" className={`flex items-center gap-1.5 text-sm ${linkColor} transition-colors`}>
              <FiLink2 size={15} /> 链接
            </Link>
          </div>

          <div className="flex sm:hidden items-center gap-4">
            <PortfolioSearch />
                       <button onClick={() => setDrawerOpen(true)} className={iconColor}>
              <FiMoreHorizontal size={20} />
            </button>
          </div>
        </div>
    </div>
      </nav>

      <div 
        className={`fixed inset-0 z-[60] sm:hidden transition-opacity duration-300 ease-in-out ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
          onClick={() => setDrawerOpen(false)} 
        />
        
        <div 
          className={`absolute top-0 right-0 h-full w-72 bg-[#F3FBFF]/60 backdrop-blur-xl p-6 shadow-2xl border-l border-white/30 overflow-y-auto transform transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="text-center mb-10 pt-8">
            {profile?.avatar_url && (
              <div className="inline-block bg-white p-2 pb-5 shadow-md rotate-[-2deg] mb-4 rounded-sm transition-transform hover:rotate-0 duration-300">
                <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover" />
              </div>
            )}
            
            {profile?.nickname && (
              <h3 
                className="text-2xl mb-2 text-slate-800 tracking-wide font-medium" 
                style={{ fontFamily: 'NameFont, serif' }}
              >
                {profile.nickname}
              </h3>
            )}
            
            {profile?.bio && (
              <p 
                className="text-sm font-light leading-relaxed px-3 tracking-wider antialiased" 
                style={{ 
                  fontFamily: 'BioFont, sans-serif',
                  color: 'rgba(51, 65, 85, 0.75)', 
                  WebkitTextStroke: '0.2px rgba(30, 41, 59, 0.5)',
                  textShadow: '0 1px 1px rgba(255,255,255,0.7), 0 2px 3px rgba(30, 41, 59, 0.1), 0 4px 6px rgba(0,0,0,0.05)',
                }}
              >
                {profile.bio}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3.5">
            <Link
              href="/guestbook"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all duration-300 group
                bg-white/30 backdrop-blur-[24px] 
                border border-white/60 
                shadow-[0_8px_32px_rgba(0,0,0,0.04)] 
                shadow-inner-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-1px_3px_rgba(30,41,59,0.05)]
                text-slate-600 hover:text-slate-900 
                hover:bg-white/40 
                hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] 
                hover:shadow-inner-[inset_0_4px_8px_rgba(255,255,255,0.8),inset_0_-1px_3px_rgba(30,41,59,0.05)]
                hover:-translate-y-0.5"
            >
              <FiMessageSquare size={16} /> 留言板
            </Link>
            <Link
              href="/links"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all duration-300 group
                bg-white/30 backdrop-blur-[24px] 
                border border-white/60 
                shadow-[0_8px_32px_rgba(0,0,0,0.04)] 
                shadow-inner-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-1px_3px_rgba(30,41,59,0.05)]
                text-slate-600 hover:text-slate-900 
                hover:bg-white/40 
                hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] 
                hover:shadow-inner-[inset_0_4px_8px_rgba(255,255,255,0.8),inset_0_-1px_3px_rgba(30,41,59,0.05)]
                hover:-translate-y-0.5"
            >
              <FiLink2 size={16} /> 链接
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
