'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiMenu, FiFilter } from 'react-icons/fi';
import PortfolioSearch from '@/components/PortfolioSearch';
import AccountEntry from '@/components/account/AccountEntry';
import { usePathname } from 'next/navigation';
import './portfolio-nav.css';

const sections = [
  { href: '/portfolio', label: '随笔' },
  { href: '/gallery', label: '图册' },
  { href: '/notes', label: 'AIRP' },
];
const extraLinks = [
  { href: '/guestbook', label: '留言板' },
  { href: '/links', label: '链接' },
];
const adminLinks = [
  { href: '/admin', label: '基本设置' },
  { href: '/admin/music', label: '音乐' },
  { href: '/admin/portfolio', label: '作品集' },
  { href: '/admin/gallery', label: '图集' },
];

type NotesControls = {
  active: 'library' | 'records';
  search: string;
  onSearch: (value: string) => void;
  onFilter: () => void;
  filterOpen: boolean;
  filterCount: number;
};
const notesLinks = [
  { href: '/notes/library', label: '词库' },
  { href: '/notes/records', label: '记录' },
];

export default function PortfolioNav({ homeHref = '/', theme = 'default', showSections = false, mode = 'site', notesControls }: { homeHref?: string; theme?: 'default' | 'light'; showSections?: boolean; mode?: 'site' | 'admin' | 'notes'; notesControls?: NotesControls }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastScrollY = useRef(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';
  const isAdmin = mode === 'admin';
  const isNotes = mode === 'notes';
  const searchScope = isNotes && notesControls ? { value: notesControls.search, onChange: notesControls.onSearch, label: notesControls.active === 'library' ? '搜索词库标题或内容' : '搜索记录标题、副标题或正文', placeholder: notesControls.active === 'library' ? '搜索词库…' : '搜索记录…' } : undefined;
  const desktopLinks = isNotes ? notesLinks : isAdmin ? adminLinks : [...(showSections ? sections : []), ...extraLinks];
  const drawerLinks = isNotes ? notesLinks : isAdmin ? adminLinks : [...sections, ...extraLinks];
  const drawerId = isNotes ? 'notes-drawer' : isAdmin ? 'admin-drawer' : 'site-drawer';
  const isActive = (href: string) => (isAdmin || isNotes) && (pathname === href || href !== '/admin' && pathname.startsWith(`${href}/`));
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
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.focus();
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
    <nav aria-label={isNotes ? '词库与记录导航' : isAdmin ? '管理面板顶部导航' : '顶部导航'} className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className={`transition-colors duration-300 ${scrolled ? isLight ? 'bg-white/50 backdrop-blur-md' : 'bg-black/30 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="pl-6 pr-3 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link href={homeHref} className={`${isLight ? 'text-[#1a1a1a]' : 'text-white'} font-serif text-lg tracking-wide`}>yuria</Link>
          <div className="hidden lg:flex items-center gap-6">
            <PortfolioSearch theme={theme} scope={searchScope} />
            {desktopLinks.map(item => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}
              className={`text-sm ${linkColor}${isAdmin && isActive(item.href) ? ' underline underline-offset-8' : ''}`}>{item.label}</Link>)}
            {isNotes && notesControls && <button type="button" aria-label="筛选" aria-expanded={notesControls.filterOpen} onClick={notesControls.onFilter} className={`relative flex items-center gap-2 min-h-9 text-sm ${linkColor}`}><FiFilter size={16} aria-hidden="true" /><span>筛选</span>{notesControls.filterCount > 0 && <span className="absolute -top-0.5 -right-1 w-1 h-1 rounded-full bg-current" aria-hidden="true" />}</button>}
            <AccountEntry placement="header" light={isLight} />
          </div>
          <div className={`flex lg:hidden shrink-0 items-center gap-1 ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>
            <PortfolioSearch theme={theme} overlay scope={searchScope} />
            {isNotes && notesControls && <button type="button" aria-label="筛选" aria-expanded={notesControls.filterOpen} onClick={notesControls.onFilter} className="relative grid place-items-center shrink-0 w-11 h-11"><FiFilter size={20} aria-hidden="true" />{notesControls.filterCount > 0 && <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-current" aria-hidden="true" />}</button>}
            <button ref={menuButton} type="button" onClick={() => setDrawerOpen(true)} aria-label="打开侧边栏" aria-expanded={drawerOpen} aria-controls={drawerId} className="grid place-items-center shrink-0 w-11 h-11"><FiMenu size={20} aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </nav>
    <div className={`site-drawer-layer lg:hidden${drawerOpen ? ' is-open' : ''}`} aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <div className="site-drawer-backdrop" onClick={() => { closeDrawer(); menuButton.current?.focus(); }} />
      <div ref={drawerRef} id={drawerId} tabIndex={-1} className="site-drawer" role="dialog" aria-modal={drawerOpen ? true : undefined} aria-label={isNotes ? '小剧场导航' : isAdmin ? '管理导航' : '网站导航'} onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <div className="site-drawer-profile">
          <AccountEntry placement="drawer" onNavigate={closeDrawer} />
        </div>
        <div className="site-drawer-links">
          {drawerLinks.map(item => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} onClick={closeDrawer}>{item.label}</Link>)}
        </div>
      </div>
    </div>
  </>;
}
