// app/gallery/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import BackButton from '@/components/gallery/BackButton';

interface Album {
  id: string;
  title: string;
  description: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('gallery_albums').select('id, title, description').eq('id', albumId).single(),
      supabase
        .from('gallery_images')
        .select('id, image_url, caption, sort_order')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true }),
    ]).then(([albumRes, imagesRes]) => {
      setAlbum(albumRes.data);
      setImages(imagesRes.data ?? []);
      setLoading(false);
    });
  }, [albumId]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext]);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40 text-sm">加载中...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-white/40 text-sm">
        <p>这个相册还没有图片</p>
        <BackButton href="/gallery" />
      </div>
    );
  }

  const active = images[current];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 背景：当前图片放大铺底 + 高斯模糊 */}
      <div
        className="absolute inset-0 scale-110 opacity-40 blur-3xl transition-all duration-500"
        style={{
          backgroundImage: `url(${active.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* BACK 按钮，左上角悬浮 */}
      <div className="fixed top-6 left-6 z-50">
        <BackButton href="/gallery" />
      </div>

      {/* 相册标题，右上角 */}
      <div className="fixed top-6 right-6 z-50 text-right">
        <p className="text-white/70 text-sm font-serif tracking-wide">{album?.title}</p>
        <p className="text-white/30 text-xs mt-0.5">{current + 1} / {images.length}</p>
      </div>

      {/* 主体：居中大图 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-20">
        <div className="relative flex items-center justify-center w-full max-w-4xl">
          {images.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-0 sm:-left-16 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center"
            >
              ‹
            </button>
          )}

          <img
            src={active.image_url}
            alt={active.caption ?? ''}
            className="max-h-[65vh] max-w-full object-contain rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-opacity duration-300"
          />

          {images.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-0 sm:-right-16 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center"
            >
              ›
            </button>
          )}
        </div>

        {/* 备注区 */}
        <div className="mt-6 min-h-[1.5rem] text-center max-w-md px-4">
          {active.caption && (
            <p className="text-white/50 text-sm font-light leading-relaxed">{active.caption}</p>
          )}
        </div>

        {/* 底部缩略图预览条 */}
        {images.length > 1 && (
          <div className="mt-8 flex gap-2 overflow-x-auto max-w-full px-4 pb-2 [&::-webkit-scrollbar]:hidden">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrent(i)}
                className={`shrink-0 w-14 h-14 rounded-sm overflow-hidden transition-all duration-200 ${
                  i === current
                    ? 'ring-2 ring-white/80 opacity-100'
                    : 'ring-1 ring-white/10 opacity-50 hover:opacity-80'
                }`}
              >
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
