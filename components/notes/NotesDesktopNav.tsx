'use client'

import Link from 'next/link'
import { FiBookOpen, FiFileText, FiSettings, FiUser } from 'react-icons/fi'
import styles from './notes-desktop.module.css'

type Props = { active: 'records' | 'library' }

export default function NotesDesktopNav({ active }: Props) {
  return <nav className={styles.rail} aria-label="AIRP 电脑端导航">
    <Link href="/" className={styles.brand}>yuria<span>AIRP</span></Link>
    <div className={styles.links}>
      <Link href="/notes/echo" aria-current={active === 'records' ? 'page' : undefined}><FiFileText size={20} />Echo</Link>
      <Link href="/notes/verse" aria-current={active === 'library' ? 'page' : undefined}><FiBookOpen size={20} />Verse</Link>
    </div>
    <div className={styles.bottom}><Link href="/admin"><FiSettings size={20} />设置</Link><Link href="/account"><FiUser size={20} />账号</Link></div>
  </nav>
}
