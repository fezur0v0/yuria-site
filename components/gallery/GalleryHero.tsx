'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function GalleryHero() {
  const [heroTitle, setHeroTitle] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('site_settings')
      .select('gallery_hero_title, gallery_hero_lines')
      .single()
      .then(({ data }) => {
        setHeroTitle(data?.gallery_hero_title ?? '图集');
        setLines(data?.gallery_hero_lines ?? []);
      });
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
        <h1 className="text-[#1a1a1a] text-4xl md:text-5xl font-serif mb-3 tracking-wide">
          {heroTitle}
        </h1>
        <p className={`text-[#1a1a1a]/70 font-serif text-base md:text-lg transition-all duration-[900ms] ${fading ? 'opacity-0 blur-md' : 'opacity-100 blur-none'}`}>
          {displayedText}
          <span className="inline-block w-[2px] h-4 bg-[#1a1a1a]/50 ml-1 align-middle animate-pulse" />
        </p>
      </div>
    </section>
  );
}
