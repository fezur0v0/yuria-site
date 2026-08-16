'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PortfolioHeroProps {
  title?: string;
  lines?: string[];
  theme?: 'light' | 'dark';
}

export default function PortfolioHero({ title, lines: linesProp, theme = 'dark' }: PortfolioHeroProps) {
  const [heroTitle, setHeroTitle] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (title !== undefined) { setHeroTitle(title); return; }
    const supabase = createClient();
    supabase.from('site_settings').select('hero_title').single().then(({ data }) => setHeroTitle(data?.hero_title ?? ''));
  }, [title]);

  useEffect(() => {
    if (linesProp !== undefined) { setLines(linesProp); return; }
    const supabase = createClient();
    supabase.from('hero_lines').select('text').order('sort_order', { ascending: true }).then(({ data }) => setLines((data ?? []).map((l) => l.text)));
  }, [linesProp]);

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

  const textColor = theme === 'light' ? 'text-[#1a1a1a]' : 'text-white';
  const subTextColor = theme === 'light' ? 'text-[#1a1a1a]/70' : 'text-white/90';
  const cursorColor = theme === 'light' ? 'bg-[#1a1a1a]/50' : 'bg-white/70';
  const shadowClass = theme === 'light' ? '' : 'drop-shadow-md';

  return (
    <section className="relative h-[45vh] min-h-[320px] w-full flex items-center justify-center text-center px-6">
      <div>
        <h1 className={`${textColor} text-4xl md:text-5xl font-serif mb-3 tracking-wide ${shadowClass}`}>
          {heroTitle}
        </h1>
        <p
          className={`${subTextColor} font-serif text-base md:text-lg transition-all duration-[900ms] ${
            fading ? 'opacity-0 blur-md' : 'opacity-100 blur-none'
          }`}
        >
          {displayedText}
          <span className={`inline-block w-[2px] h-4 ${cursorColor} ml-1 align-middle animate-pulse`} />
        </p>
      </div>
    </section>
  );
}
