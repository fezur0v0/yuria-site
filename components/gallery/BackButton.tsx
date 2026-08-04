// components/gallery/BackButton.tsx
'use client';

import Link from 'next/link';

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}

const LETTER_STYLES = [
  { bg: '#1a1a1a', color: '#f5f2ea', rotate: -6, fontSize: '1em', texture: null },
  { bg: '#e8e4d8', color: '#1a1a1a', rotate: 4,  fontSize: '1.05em', texture: '/textures/paper-cream.jpg' },
  { bg: '#c9c4b4', color: '#1a1a1a', rotate: -3, fontSize: '0.95em', texture: '/textures/paper-white.jpg' },
  { bg: '#1a1a1a', color: '#e8e4d8', rotate: 5,  fontSize: '1em', texture: null },
];

const LABEL_LETTERS = ['B', 'A', 'C', 'K'];

export default function BackButton({ href, onClick, label, className = '' }: BackButtonProps) {
  const letters = label ? label.toUpperCase().split('') : LABEL_LETTERS;

  const content = (
    <span className="inline-flex items-center gap-[3px] select-none">
      {letters.map((char, i) => {
        const style = LETTER_STYLES[i % LETTER_STYLES.length];
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center font-serif font-bold uppercase transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              backgroundColor: style.bg,
              backgroundImage: style.texture ? `url(${style.texture})` : undefined,
              backgroundBlendMode: style.texture ? 'multiply' : undefined,
              backgroundSize: 'cover',
              color: style.color,
              transform: `rotate(${style.rotate}deg)`,
              fontSize: style.fontSize,
              width: '1.6em',
              height: '1.8em',
              boxShadow: '1px 2px 4px rgba(0,0,0,0.35)',
              borderRadius: '2px 3px 2px 4px / 3px 2px 4px 2px',
              filter: 'contrast(1.05)',
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );

  const wrapperClass = `group inline-flex items-center gap-2 px-3 py-2 transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`;

  if (href) {
    return (
      <Link href={href} className={wrapperClass} aria-label="返回">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={wrapperClass} aria-label="返回" type="button">
      {content}
    </button>
  );
}
