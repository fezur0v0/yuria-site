'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import styles from './links.module.css';

export default function CopySiteLink() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText('https://www.yuria.xin/');
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 2600);
    } catch { setStatus('error'); }
  }
  return <div className={styles.copyArea}>
    <button type="button" onClick={copy} className={styles.copyButton} aria-label="复制本站链接">{status === 'copied' ? <FiCheck size={15} aria-hidden="true" /> : <FiCopy size={15} aria-hidden="true" />}<span>{status === 'copied' ? 'LINK COPIED' : 'COPY SITE LINK'}</span></button>
    <span role="status" className={styles.copyStatus}>{status === 'error' ? 'Copy unavailable. Select the address above.' : status === 'copied' ? 'Ready to keep.' : ''}</span>
  </div>;
}
