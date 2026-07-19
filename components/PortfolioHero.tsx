'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface HeroData {
  hero_title: string;
  hero_image_url: string | null;
}

export default function PortfolioHero() {
  const [heroData, setHeroData] = useState<HeroData | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('site_settings')
      .select('hero_title, hero_image_url')
      .single()
      .then(({ data }) => setHeroData(data));
    supabase
      .from('hero_lines')
      .select('text')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setLines((data ?? []).map((l) => l.text)));
  }, []);

  // 打字机效果：逐字浮现当前这句，打完停留一会儿，再淡出模糊消失，换下一句
  useEffect(() => {
    if (lines.length === 0) return;
    const currentLine = lines[lineIndex % lines.length];
    let charIndex = 0;
    setDisplayedText('');
    setFading(false);

    const typeTimer = setInterval(() => {
      charIndex++;
      setDisplayedText(currentLine.slice(0, charIndex));

      if (charIndex >= currentLine.length) {
        clearInterval(typeTimer);

        setTimeout(() => {
          setFading(true);
          setTimeout(() => {
            setLineIndex((prev) => prev + 1);
          }, 900);
        }, 2600);
      }
    }, 120);

    return () => clearInterval(typeTimer);
  }, [lineIndex, lines]);

  return (
    <section
      className="relative h-screen w-full flex items-end justify-start overflow-hidden"
      style={{
        backgroundImage: heroData?.hero_image_url ? `url(${heroData.hero_image_url})` : undefined,
        backgroundColor: '#1a1a1a',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 px-8 pb-24 md:px-16">
        <h1 className="text-white text-4xl md:text-6xl font-serif mb-4 tracking-wide">
          {heroData?.hero_title ?? ''}
        </h1>
        <p
          className={`text-white/90 font-serif text-lg md:text-xl transition-all duration-[900ms] ${
            fading ? 'opacity-0 blur-md' : 'opacity-100 blur-none'
          }`}
        >
          {displayedText}
          <span className="inline-block w-[2px] h-5 bg-white/70 ml-1 align-middle animate-pulse" />
        </p>
      </div>
    </section>
  );
}
