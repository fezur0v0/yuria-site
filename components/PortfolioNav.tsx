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
      <style dangerouslySetInnerHTML={{ __html: `
        @font-face {
          font-family: 'NameFont';
          src: url('https://a.tuchuangyun.top/autoupload/XpaunVhfV7QakiRQCrbgNdiO_OyvX7mIgxFBfDMDErs/20260721/Q5JE/Distant_Stroke_Medium.otf') format('opentype');
        }
        @font-face {
          font-family: 'BioFont';
          src: url('https://a.tuchuangyun.top/autoupload/XpaunVhfV7QakiRQCrbgNdiO_OyvX7mIgxFBfDMDErs/20260624/4rx3/KBIZmjo__M.ttf') format('truetype');
        }

        .water-glass-button {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.25);     
          box-shadow: 
            inset 0 1px 1px rgba(255, 255, 255, 0.3),
            inset 0 -1px 1px rgba(0, 0, 0, 0.05),
            0 4px 12px rgba(0, 0, 0, 0.02);
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .water-glass-button:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-2px) scale(1.01);
          box-shadow: 
            inset 0 1px 2px rgba(255, 255, 255, 0.5),
            0 8px 20px rgba(0, 0, 0, 0.05);
        }

    
        .premium-text-stasis {
          color: #333; 
          text-shadow: 
            0.5px 0.5px 0px rgba(0, 0, 0, 0.15), 
            -2px -1px 1px rgba(150, 150, 150, 0.3), 
            3px 2px 2px rgba(100, 100, 100, 0.2);  
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

      <div 
        className={`fixed inset-0 z-[60] sm:hidden transition-opacity duration-400 ease-in-out ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="absolute inset-0 bg-black/15 backdrop-blur-sm transition-opacity duration-400" 
          onClick={() => setDrawerOpen(false)} 
        />
        
    
        <div 
          className={`absolute top-0 right-0 h-full w-72 bg-[#F3FBFF]/75 backdrop-blur-2xl p-6 shadow-2xl border-l border-white/20 overflow-y-auto transform transition-transform duration-400 cubic-bezier(0.23, 1, 0.32, 1) ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="text-center mb-10 pt-10">
            {profile?.avatar_url && (
              <div className="inline-block bg-white p-2 pb-5 shadow-lg rotate-[-2deg] mb-5 rounded-sm transition-transform hover:rotate-0 duration-300">
                <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover" />
              </div>
            )}

            {profile?.nickname && (
              <h3 
                className="text-2xl mb-3 text-slate-800 tracking-wide font-medium" 
                style={{ fontFamily: 'NameFont, serif' }}
              >
                {profile.nickname}
              </h3>
            )}
            
            {profile?.bio && (
              <p 
                className="premium-text-stasis text-xl text-slate-600 leading-snug px-3 tracking-normal font-light" 
                style={{ fontFamily: 'BioFont, sans-serif' }}
              >
                {profile.bio}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Link
              href="/guestbook"
              onClick={() => setDrawerOpen(false)}
              className="water-glass-button flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm text-slate-700 hover:text-black font-medium transition-all duration-300"
            >
              <FiMessageSquare size={17} className="opacity-80" /> 留言板
            </Link>
            <Link
              href="/links"
              onClick={() => setDrawerOpen(false)}
              className="water-glass-button flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm text-slate-700 hover:text-black font-medium transition-all duration-300"
            >
              <FiLink2 size={17} className="opacity-80" /> 链接
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
