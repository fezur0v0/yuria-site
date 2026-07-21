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

      {/* 侧边栏整体容器：始终渲染，通过透明度和指针事件控制显示，保证动画流畅 */}
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
        
        {/* 侧边栏面板：加入位移动画和自定义背景色 */}
        <div 
          className={`absolute top-0 right-0 h-full w-72 bg-[#F3FBFF] p-6 shadow-xl overflow-y-auto transform transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="text-center mb-10 pt-8">
            {profile?.avatar_url && (
              <div className="inline-block bg-white p-2 pb-3 shadow-sm mb-4 rounded-xl">
                <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover rounded-lg" />
              </div>
            )}
            {profile?.nickname && (
              <h3 
                className="text-2xl mb-2 text-gray-800" 
                style={{ fontFamily: 'NameFont, serif' }}
              >
                {profile.nickname}
              </h3>
            )}
            {profile?.bio && (
              <p 
                className="text-sm text-gray-500 leading-relaxed px-2 tracking-wide" 
                style={{ fontFamily: 'BioFont, sans-serif' }}
              >
                {profile.bio}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* 韩系 INS 风按钮：方正排版、大圆角、纯白底色、轻微阴影及悬浮动画 */}
            <Link
              href="/guestbook"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-sm text-gray-500 hover:text-gray-800 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <FiMessageSquare size={16} /> 留言板
            </Link>
            <Link
              href="/links"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-sm text-gray-500 hover:text-gray-800 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <FiLink2 size={16} /> 链接
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
