'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import PortfolioNav from '@/components/PortfolioNav';
import FloatingWidget from '@/components/FloatingWidget';
import GalleryHero from '@/components/gallery/GalleryHero';
import AlbumCarousel from '@/components/gallery/AlbumCarousel';
import type { GalleryAlbum } from '@/components/gallery/AlbumStackCard';
import styles from '@/components/gallery/gallery-home.module.css';

export default function GalleryPage() {
  const [result, setResult] = useState<{ albums: GalleryAlbum[]; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let disposed = false;
    async function load() {
      try {
        const { data, error } = await createClient().from('gallery_albums')
          .select('id, title, cover_image_url, sort_order').eq('is_visible', true)
          .order('sort_order', { ascending: true }).order('id', { ascending: true })
          .abortSignal(controller.signal);
        if (!disposed) setResult({ albums: data ?? [], failed: !!error });
      } catch {
        if (!disposed) setResult({ albums: [], failed: true });
      } finally { clearTimeout(timeout); }
    }
    void load();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  return (
    <div className={styles.page}>
      <PortfolioNav homeHref="/" theme="light" />
      <main className={styles.main}>
        <GalleryHero />
        {result === null ? (
          <div className={styles.loading} role="status" aria-label="正在加载相册">
            <div className={styles.skeleton} aria-hidden="true" />
          </div>
        ) : result.failed ? (
          <div className={styles.message} role="alert">
            <p>相册暂时无法加载</p>
            <button className={styles.retry} onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>重试</button>
          </div>
        ) : result.albums.length === 0 ? (
          <div className={styles.message}><p>还没有相册</p></div>
        ) : <AlbumCarousel albums={result.albums} />}
      </main>
      <FloatingWidget settingsHref="/admin/gallery" />
    </div>
  );
}
