'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import styles from './admin-nav.module.css';

const items = [
  { href: '/admin', label: '基本设置' },
  { href: '/admin/music', label: '音乐' },
  { href: '/admin/portfolio', label: '作品集' },
  { href: '/admin/gallery', label: '图集' },
  { href: '/account', label: '账号' },
];

export default function AdminNav({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => pathname === href || href !== '/admin' && pathname.startsWith(`${href}/`);
  const current = items.find(item => isActive(item.href));

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener('keydown', escape);
    desktop.addEventListener('change', resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', escape);
      desktop.removeEventListener('change', resize);
    };
  }, [open]);

  const links = (mobile = false) => items.map(item => <Link key={item.href} href={item.href}
    aria-current={isActive(item.href) ? 'page' : undefined}
    className={mobile ? styles.drawerLink : styles.link} onClick={() => setOpen(false)}>
    {item.label}
  </Link>);

  return <>
    <header className={`${styles.header} ${theme === 'dark' ? styles.dark : ''}`}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label="Yuria，返回网站首页">yuria</Link>
        <span className={styles.context}>管理面板</span>
        <nav className={styles.desktop} aria-label="管理面板导航">{links()}</nav>
        <div className={styles.mobile}>
          <span className={styles.current}>{current?.label}</span>
          <button ref={trigger} type="button" className={styles.menu} aria-label="打开管理导航"
            aria-expanded={open} aria-controls="admin-navigation-drawer" onClick={() => setOpen(true)}>
            <FiMenu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
    <div className={`${styles.layer} ${open ? styles.open : ''}`} aria-hidden={!open} inert={!open}>
      <button type="button" className={styles.backdrop} tabIndex={-1} aria-label="关闭管理导航"
        onClick={() => { setOpen(false); trigger.current?.focus(); }} />
      <div ref={drawer} id="admin-navigation-drawer" className={styles.drawer} tabIndex={-1}
        role="dialog" aria-modal={open ? true : undefined} aria-label="管理面板导航" onKeyDown={event => {
          if (event.key !== 'Tab') return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
          const first = controls[0]; const last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
            event.preventDefault(); last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first?.focus();
          }
        }}>
        <p className={styles.drawerTitle}>管理面板</p>
        <nav aria-label="管理入口" className={styles.drawerLinks}>{links(true)}</nav>
        <Link href="/" className={styles.home} onClick={() => setOpen(false)}>返回网站</Link>
      </div>
    </div>
  </>;
}
