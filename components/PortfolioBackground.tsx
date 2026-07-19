'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function PortfolioBackground() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blur, setBlur] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('site_settings')
      .select('hero_image_url')
      .single()
      .then(({ data }) => setImageUrl(data?.hero_image_url ?? null));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const maxBlur = 16;
      const distance = 500; // 滚动多少px到达最大模糊
      const progress = Math.min(window.scrollY / distance, 1);
      setBlur(progress * maxBlur);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 transition-[filter] duration-100"
      style={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundColor: '#1a1a1a',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${blur}px)`,
      }}
    >
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}
