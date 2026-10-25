'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PortfolioSearch from '@/components/PortfolioSearch';
import { createClient } from '@/utils/supabase/client';
import AccountEntry from '@/components/account/AccountEntry';
import './portfolio-nav.css';

interface Profile {
  nickname: string | null;
  bio: string | null;
}

const sections = [
  { href: '/portfolio', label: '随笔' },
  { href: '/gallery', label: '图册' },
  { href: '/notes', label: 'AIRP' },
];
const extraLinks = [
  { href: '/guestbook', label: '留言板' },
  { href: '/links', label: '链接' },
];

export default function PortfolioNav({ homeHref = '/', theme = 'default', showSections = false }: { homeHref?: string; theme?: 'default' | 'light'; showSections?: boolean }) {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const lastScrollY = useRef(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const isLight = theme === 'light';
  const linkColor = isLight ? 'text-[#1a1a1a]/70 hover:text-[#1a1a1a]' : 'text-white/80 hover:text-white';
  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);
      if (currentY > lastScrollY.current && currentY > 80) setVisible(false);
      else if (currentY < lastScrollY.current) setVisible(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    createClient().from('site_settings').select('nickname, bio').single().then(({ data }) => setProfile(data));
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawerOpen(false); menuButton.current?.focus(); }
    };
    const wide = window.matchMedia('(min-width: 1024px)');
    const onWide = () => { if (wide.matches) setDrawerOpen(false); };
    wide.addEventListener('change', onWide);
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      wide.removeEventListener('change', onWide);
      document.removeEventListener('keydown', escape);
    };
  }, [drawerOpen]);

  return <>
    <style dangerouslySetInnerHTML={{ __html: `
      @font-face { font-family: 'NameFont'; src: url('https://a.tuchuangyun.top/autoupload/XpaunVhfV7QakiRQCrbgNdiO_OyvX7mIgxFBfDMDErs/20260721/Q5JE/Distant_Stroke_Medium.otf') format('opentype'); }
      @font-face { font-family: 'BioFont'; src: url('https://a.tuchuangyun.top/autoupload/XpaunVhfV7QakiRQCrbgNdiO_OyvX7mIgxFBfDMDErs/20260624/4rx3/KBIZmjo__M.ttf') format('truetype'); }
    ` }} />
    <nav aria-label="顶部导航" className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className={`transition-colors duration-300 ${scrolled ? isLight ? 'bg-white/50 backdrop-blur-md' : 'bg-black/30 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="px-6 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link href={homeHref} className={`${isLight ? 'text-[#1a1a1a]' : 'text-white'} font-serif text-lg tracking-wide`}>yuria</Link>
          <div className="hidden lg:flex items-center gap-6">
            <PortfolioSearch theme={theme} textOnly />
            {showSections && sections.map(item => <Link key={item.href} href={item.href} className={`text-sm ${linkColor}`}>{item.label}</Link>)}
            {extraLinks.map(item => <Link key={item.href} href={item.href} className={`text-sm ${linkColor}`}>{item.label}</Link>)}
            <AccountEntry placement="header" light={isLight} />
          </div>
          <div className={`flex lg:hidden items-center gap-6 ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>
            <PortfolioSearch theme={theme} textOnly />
            <button ref={menuButton} type="button" onClick={() => setDrawerOpen(true)} aria-label="打开侧边栏" aria-expanded={drawerOpen} aria-controls="site-drawer" className="text-sm py-2">菜单</button>
          </div>
        </div>
      </div>
    </nav>
    <div className={`site-drawer-layer lg:hidden${drawerOpen ? ' is-open' : ''}`} aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <div className="site-drawer-backdrop" onClick={closeDrawer} />
      <div id="site-drawer" className="site-drawer" role="dialog" aria-modal={drawerOpen ? true : undefined} aria-label="网站导航" onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <button ref={closeButton} type="button" className="site-drawer-close" onClick={() => { closeDrawer(); menuButton.current?.focus(); }}>关闭</button>
        <div className="site-drawer-profile">
          <AccountEntry placement="drawer" onNavigate={closeDrawer} />
          {profile?.nickname && <h3 style={{ fontFamily: 'NameFont, serif' }}>{profile.nickname}</h3>}
          {profile?.bio && <p style={{ fontFamily: 'BioFont, sans-serif' }}>{profile.bio}</p>}
        </div>
        <div className="site-drawer-links">
          {[...sections, ...extraLinks].map(item => <Link key={item.href} href={item.href} onClick={closeDrawer}>{item.label}</Link>)}
        </div>
      </div>
    </div>
  </>;
}
