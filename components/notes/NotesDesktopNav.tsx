'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { FiBookOpen, FiFileText, FiFilter, FiSearch, FiSettings, FiUser } from 'react-icons/fi'
import styles from './notes-desktop.module.css'

type Props = { active: 'records' | 'library'; search?: string; onSearch?: (value: string) => void; onFilter?: () => void; filterOpen?: boolean; filterCount?: number }

export default function NotesDesktopNav({ active, search, onSearch, onFilter, filterOpen, filterCount = 0 }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)
  return <nav className={styles.rail} aria-label="AIRP 电脑端导航">
    <Link href="/" className={styles.brand}>yuria<span>AIRP</span></Link>
    <div className={styles.links}>
      <Link href="/notes/echo" aria-current={active === 'records' ? 'page' : undefined}><FiFileText size={20} />Echo</Link>
      <Link href="/notes/verse" aria-current={active === 'library' ? 'page' : undefined}><FiBookOpen size={20} />Verse</Link>
      <button type="button" aria-expanded={searchOpen} onClick={() => { if (searchOpen) { setSearchOpen(false); if (onSearch) onSearch(''); else setQuery('') } else { setSearchOpen(true); requestAnimationFrame(() => input.current?.focus()) } }}><FiSearch size={20} />搜索</button>
      {searchOpen && <form action="/notes/echo" onSubmit={onSearch ? event => { event.preventDefault(); input.current?.focus() } : undefined} className={styles.search}><input ref={input} type="search" name="q" aria-label={active === 'records' ? '搜索 Echo' : '搜索 Verse'} placeholder="Search..." value={search ?? query} onChange={event => onSearch ? onSearch(event.target.value) : setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setSearchOpen(false); if (onSearch) onSearch(''); else setQuery('') } }} /></form>}
      {onFilter && <button type="button" aria-expanded={filterOpen} onClick={onFilter}><FiFilter size={20} />筛选{filterCount > 0 && <span className={styles.count}>{filterCount}</span>}</button>}
    </div>
    <div className={styles.bottom}><Link href="/admin"><FiSettings size={20} />设置</Link><Link href="/account"><FiUser size={20} />账号</Link></div>
  </nav>
}
