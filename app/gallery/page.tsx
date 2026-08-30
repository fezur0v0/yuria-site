'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import PortfolioNav from '@/components/PortfolioNav';
import FloatingWidget from '@/components/FloatingWidget';
import AlbumStackCard from '@/components/gallery/AlbumStackCard';
import GalleryHero from '@/components/gallery/GalleryHero';

interface Album {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  sort_order: number;
  gallery_images: { image_url: string; sort_order: number }[];
}

export default function GalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('gallery_albums')
      .select('id, title, cover_image_url, description, sort_order, gallery_images(image_url, sort_order)')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setAlbums(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f2ec]">
     <PortfolioNav homeHref="/" theme="light" />
    <GalleryHero />
      <div className="px-6 sm:px-12 pb-24 max-w-6xl mx-auto">
        {loading ? (
          <p className="text-black/30 text-sm">加载中...</p>
        ) : albums.length === 0 ? (
          <p className="text-black/30 text-sm">还没有相册</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
            {albums.map((album) => (
              <Link key={album.id} href={`/gallery/${album.id}`}>
                <AlbumStackCard album={album} />
              </Link>
            ))}
          </div>
        )}
      </div>
      <FloatingWidget settingsHref="/admin/gallery" />
    </div>
  );
}
