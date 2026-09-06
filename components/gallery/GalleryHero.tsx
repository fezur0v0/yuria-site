'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useReducedMotion } from './useReducedMotion';
import styles from './gallery-home.module.css';

export default function GalleryHero() {
  const [content, setContent] = useState({ title: '', lines: [] as string[] });
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let disposed = false;
    async function load() {
      try {
        const client = createClient();
        const [title, subtitles] = await Promise.all([
          client.from('site_settings').select('gallery_hero_title').abortSignal(controller.signal).single(),
          client.from('hero_lines').select('text').order('sort_order', { ascending: true }).abortSignal(controller.signal),
        ]);
        if (disposed) return;
        setContent({
          title: title.data?.gallery_hero_title?.trim() || '图集',
          lines: (subtitles.data ?? []).map((line) => typeof line.text === 'string' ? line.text.trim() : '').filter(Boolean),
        });
        setFailed(!!title.error || !!subtitles.error);
      } catch {
        if (!disposed) setFailed(true);
      } finally { clearTimeout(timeout); }
    }
    void load();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  return (
    <header className={styles.hero}>
      <h1 className={styles.heading}>{content.title || '\u00a0'}</h1>
      <Typewriter key={JSON.stringify(content.lines)} lines={content.lines} />
      {failed && <button className={styles.retry} onClick={() => setAttempt((value) => value + 1)}>标题文案加载不完整，重试</button>}
    </header>
  );
}

function Typewriter({ lines }: { lines: string[] }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState({ index: 0, count: 0, fading: false });
  const characters = Array.from(lines[state.index] ?? '');
  useEffect(() => {
    if (reduced || !lines.length) return;
    const length = Array.from(lines[state.index] ?? '').length;
    let timer: ReturnType<typeof setTimeout>;
    if (state.count < length) {
      timer = setTimeout(() => setState((value) => ({ ...value, count: value.count + 1 })), 120);
    } else if (lines.length > 1) {
      timer = setTimeout(() => setState((value) => value.fading
        ? { index: (value.index + 1) % lines.length, count: 0, fading: false }
        : { ...value, fading: true }), state.fading ? 350 : 2600);
    } else return;
    return () => clearTimeout(timer);
  }, [lines, state, reduced]);
  if (!lines.length) return <div className={styles.subtitleSpace} />;
  return (
    <div className={styles.subtitleWrap}>
      <div className={styles.subtitle}>
        {/* Reserve the tallest full line at this viewport so typing cannot move the carousel. */}
        {lines.map((line, index) => <span key={index} className={styles.measureLine} aria-hidden="true">{line}<span className={styles.cursorSpace} /></span>)}
        <span className={styles.typedLine} style={{ opacity: !reduced && state.fading ? 0 : 1 }} aria-hidden="true">
          {reduced ? lines[0] : characters.slice(0, state.count).join('')}
          {!reduced && <span className={styles.cursor} data-still={lines.length === 1 && state.count >= characters.length} />}
        </span>
        <span className={styles.srOnly}>{lines.join('。')}</span>
      </div>
    </div>
  );
}
