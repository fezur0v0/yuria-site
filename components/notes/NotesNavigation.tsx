'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { FiSearch, FiMenu, FiX, FiFilter } from 'react-icons/fi'
import AccountEntry from '@/components/account/AccountEntry'
import styles from './notes-shell.module.css'

type Panel = 'menu' | 'search' | 'filter'

type Props = {
  active: 'library' | 'records'
  search: string
  onSearch: (value: string) => void
  filterCount: number
  filterContent: ReactNode
}

export default function NotesNavigation({ active, search, onSearch, filterCount, filterContent }: Props) {
  const [panel, setPanel] = useState<Panel | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const close = () => setPanel(null)
  function open(next: Panel) {
    if (!dialog.current?.open) trigger.current = document.activeElement as HTMLElement
    setPanel(next)
  }

  useEffect(() => {
    const element = dialog.current
    if (!element || !panel) return
    if (!element.open) element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => (panel === 'search' ? searchInput.current : closeButton.current)?.focus())
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = overflow
    }
  }, [panel])

  useEffect(() => {
    if (panel === null && dialog.current?.open) {
      dialog.current.close()
      trigger.current?.focus({ preventScroll: true })
    }
  }, [panel])

  const links = <>
    <Link href="/notes/library" aria-current={active === 'library' ? 'page' : undefined} onClick={close}>词库</Link>
    <Link href="/notes/records" aria-current={active === 'records' ? 'page' : undefined} onClick={close}>记录</Link>
  </>

  return <>
    <header className={styles.navigation}>
      <nav className={styles.bar} aria-label="词库与记录导航">
        <Link href="/" className={styles.brand}>yuria</Link>
        <div className={styles.navItems}>
          <button type="button" aria-label="搜索" aria-expanded={panel === 'search'} onClick={() => open('search')}><FiSearch size={18} /><span className={styles.searchLabel}>搜索</span>{search && <span className={styles.indicator} />}</button>
          {links}
          <button type="button" aria-label="筛选" aria-expanded={panel === 'filter'} onClick={() => open('filter')}><FiFilter size={18} /><span className={styles.filterLabel}>筛选</span>{filterCount > 0 && <span className={styles.indicator} />}</button>
          <span className={styles.desktopAccount}><AccountEntry placement="header" light /></span>
          <button type="button" className={styles.menuToggle} aria-label="打开侧边栏" aria-expanded={panel === 'menu'} onClick={() => open('menu')}><FiMenu size={20} /></button>
        </div>
      </nav>
    </header>
    <dialog ref={dialog} className={`${styles.drawer} ${panel === 'search' ? styles.searchDrawer : ''}`} aria-label={panel === 'menu' ? '词库导航' : panel === 'search' ? '搜索内容' : active === 'library' ? '分类与标签筛选' : '角色筛选'} onCancel={close} onClose={close} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close() } }}>
      <div className={styles.drawerHeader}><span>{panel === 'filter' ? '筛选' : panel === 'search' ? '搜索' : 'yuria'}</span><button ref={closeButton} type="button" aria-label="关闭侧栏" onClick={close}><FiX size={22} /></button></div>
      {panel === 'menu' && <div className={styles.menuBody}>
        <div className={styles.profile}><AccountEntry placement="drawer" light onNavigate={close} /></div>
        <nav className={styles.drawerLinks} aria-label="侧边栏页面">{links}</nav>
      </div>}
      {panel === 'search' && <div className={styles.searchBody}>
        <label htmlFor="notes-search">{active === 'library' ? '搜索词库标题或内容' : '搜索记录标题、副标题或正文'}</label>
        <div className={styles.searchField}><FiSearch size={18} /><input ref={searchInput} id="notes-search" type="search" value={search} onChange={e => onSearch(e.target.value)} placeholder={active === 'library' ? '搜索词库…' : '搜索记录…'} /></div>
        <div className={styles.searchActions}><button type="button" onClick={() => onSearch('')} disabled={!search}>清空</button><button type="button" onClick={close}>查看结果</button></div>
      </div>}
      {panel === 'filter' && <div className={styles.filterBody}>{filterContent}</div>}
    </dialog>
  </>
}
