'use client';

import { useRef, useState } from 'react';
import MeProfile from './MeProfile';
import MeDialogue from './MeDialogue';
import type { MeContent } from './content';
import type { MeEditor } from './editing';
import { FiCheck, FiLoader, FiMessageCircle, FiUser, FiX } from 'react-icons/fi';
import { meMincho } from '@/components/me/fonts';
import styles from './me.module.css';

type View = 'profile' | 'dialogue';

export default function MePage({ content, editor }: { content: MeContent; editor?: MeEditor }) {
  const [view, setView] = useState<View>('profile');
  const scrollPositions = useRef<Record<View, number>>({ profile: 0, dialogue: 0 });
  const swipe = useRef<{ x: number; y: number; time: number } | null>(null);
  function changeView(next: View) {
    if (next === view) return;
    scrollPositions.current[view] = window.scrollY;
    setView(next);
    requestAnimationFrame(() => window.scrollTo({ top: scrollPositions.current[next], behavior: 'instant' }));
  }

  return <div lang="zh-CN" className={`${styles.page} ${meMincho.variable}${editor ? ` ${styles.editing}` : ''}`} data-view={view} onTouchStart={event => {
    swipe.current = null;
    if (editor || event.touches.length !== 1 || window.matchMedia('(min-width: 1024px)').matches || (event.target instanceof Element && event.target.closest('button, a, input, textarea, select, [role="button"]'))) return;
    swipe.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: performance.now() };
  }} onTouchCancel={() => { swipe.current = null; }} onTouchEnd={event => {
    const start = swipe.current; swipe.current = null;
    if (!start || !event.changedTouches.length || performance.now() - start.time > 700) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (view === 'profile' && dx < 0) changeView('dialogue');
    else if (view === 'dialogue' && dx > 0) changeView('profile');
  }}>
    <nav className={styles.mobileControls} aria-label="简介与对话切换">
      <button type="button" className={styles.viewSwitch} aria-label={view === 'profile' ? '进入对话' : '查看简介'} aria-controls={view === 'profile' ? 'me-dialogue' : 'me-profile'} disabled={editor?.busy} onClick={() => changeView(view === 'profile' ? 'dialogue' : 'profile')}>{view === 'profile' ? <FiMessageCircle size={18} /> : <FiUser size={18} />}<span>{view === 'profile' ? '对话' : '简介'}</span></button>
      {editor && <><button type="button" aria-label="取消编辑" title="取消编辑" disabled={editor.busy} onClick={editor.onCancel}><FiX size={19} /></button><button type="button" aria-label="保存主页" title="保存主页" disabled={editor.busy || !editor.dirty} onClick={editor.onSave}>{editor.busy ? <FiLoader size={19} className={styles.editSpinner} /> : <FiCheck size={19} />}</button></>}
    </nav>
    <main className={styles.main} aria-label="关于 yuria">
      <MeProfile content={content} editor={editor} />
      <MeDialogue content={content} view={view} editor={editor} />
    </main>
  </div>;
}
