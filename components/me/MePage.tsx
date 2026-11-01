'use client';

import { useRef, useState } from 'react';
import PortfolioNav from '@/components/PortfolioNav';
import MeProfile from './MeProfile';
import MeDialogue from './MeDialogue';
import type { MeContent } from './content';
import type { MeEditor } from './editing';
import { FiCheck, FiLoader, FiMessageCircle, FiUser, FiX } from 'react-icons/fi';
import Link from 'next/link';
import styles from './me.module.css';

type View = 'profile' | 'dialogue';

export default function MePage({ content, editor }: { content: MeContent; editor?: MeEditor }) {
  const [view, setView] = useState<View>('profile');
  const scrollPositions = useRef<Record<View, number>>({ profile: 0, dialogue: 0 });
  function changeView(next: View) {
    if (next === view) return;
    scrollPositions.current[view] = window.scrollY;
    setView(next);
    requestAnimationFrame(() => window.scrollTo({ top: scrollPositions.current[next], behavior: 'instant' }));
  }

  return <div lang="zh-CN" className={`${styles.page}${editor ? ` ${styles.editing}` : ''}`} data-view={view}>
    <div className={styles.mobileNav}>{editor ? <nav className={styles.editorMobileNav} aria-label="编辑主页导航"><Link href="/admin">yuria</Link><div>
      <button type="button" aria-label="个人简介" aria-pressed={view === 'profile'} onClick={() => changeView('profile')}><FiUser size={20} /></button>
      <button type="button" aria-label="文游设置" aria-pressed={view === 'dialogue'} onClick={() => changeView('dialogue')}><FiMessageCircle size={20} /></button>
      <button type="button" aria-label="取消编辑" title="取消编辑" disabled={editor.busy} onClick={editor.onCancel}><FiX size={20} /></button>
      <button type="button" aria-label="保存主页" title="保存主页" disabled={editor.busy || !editor.dirty} onClick={editor.onSave}>{editor.busy ? <FiLoader size={20} className={styles.editSpinner} /> : <FiCheck size={20} />}</button>
    </div></nav> : <PortfolioNav theme="light" showSections meControls={{ view, onViewChange: changeView }} />}</div>
    <main className={styles.main} aria-label="关于 yuria">
      <MeProfile content={content} editor={editor} />
      <MeDialogue content={content} view={view} editor={editor} />
    </main>
  </div>;
}
