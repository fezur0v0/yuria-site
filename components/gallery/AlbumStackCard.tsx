'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './gallery-home.module.css';

export interface GalleryAlbum {
  id: string;
  title: string;
  cover_image_url: string | null;
  sort_order: number;
}

export type TapeVariant = 'center' | 'offset' | 'none';

export default function AlbumStackCard({
  album,
  priority = false,
  tape = 'none',
}: {
  album: GalleryAlbum;
  priority?: boolean;
  tape?: TapeVariant;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = album.cover_image_url;
  return (
    <div className={styles.print} data-tape={tape}>
      <div className={styles.photo}>
        {source && source !== failedUrl ? (
          <Image src={source} alt="" fill unoptimized
            sizes="(max-width: 639px) 76vw, (max-width: 1023px) 34vw, 360px"
            priority={priority} loading={priority ? 'eager' : 'lazy'} draggable={false}
            onError={() => setFailedUrl(source)} className={styles.cover} />
        ) : (
          <span className={styles.placeholder}>{source ? '封面暂时无法显示' : '暂无封面'}</span>
        )}
      </div>
      <span className={styles.albumTitle} title={album.title}>{album.title}</span>
    </div>
  );
}
