'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function PortfolioHero() {
  const [heroTitle, setHeroTitle] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('site_settings').select('hero_title').single().then(({ data }) => setHeroTitle(data?.hero_title ?? ''));
    supabase.from('hero_lines').select('text').order('sort_order', { ascending: true }).then(({ data }) => setLines((data ?? []).map((l) => l.text)));
  }, []);

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
          setTimeout(() => setLineIndex((p) => p + 1), 900);
        }, 2600);
      }
    }, 120);

    return () => clearInterval(typeTimer);
  }, [lineIndex, lines]);

  return (
    <section className="relative h-[45vh] min-h-[320px] w-full flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-white text-4xl md:text-5xl font-serif mb-3 tracking-wide drop-shadow-md">
          {heroTitle}
        </h1>
        <p
          className={`text-white/90 font-serif text-base md:text-lg transition-all duration-[900ms] ${
            fading ? 'opacity-0 blur-md' : 'opacity-100 blur-none'
          }`}
        >
          {displayedText}
          <span className="inline-block w-[2px] h-4 bg-white/70 ml-1 align-middle animate-pulse" />
        </p>
      </div>
    </section>
  );
}
