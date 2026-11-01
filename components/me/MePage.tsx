'use client';

import { useRef, useState } from 'react';
import PortfolioNav from '@/components/PortfolioNav';
import MeProfile from './MeProfile';
import MeDialogue from './MeDialogue';
import styles from './me.module.css';

type View = 'profile' | 'dialogue';

export default function MePage() {
  const [view, setView] = useState<View>('profile');
  const scrollPositions = useRef<Record<View, number>>({ profile: 0, dialogue: 0 });
  function changeView(next: View) {
    if (next === view) return;
    scrollPositions.current[view] = window.scrollY;
    setView(next);
    requestAnimationFrame(() => window.scrollTo({ top: scrollPositions.current[next], behavior: 'instant' }));
  }

  return <div lang="zh-CN" className={styles.page} data-view={view}>
    <PortfolioNav theme="light" showSections meControls={{ view, onViewChange: changeView }} />
    <main className={styles.main} aria-label="关于 yuria">
      <MeProfile />
      <MeDialogue />
    </main>
  </div>;
}
