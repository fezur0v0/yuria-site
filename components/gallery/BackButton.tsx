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
  { bg: '#292824', color: '#f7f2e8', rotate: -4, fontSize: '12px', texture: null },
  { bg: '#eee8dc', color: '#393733', rotate: 2, fontSize: '12px', texture: '/textures/paper-cream.jpg' },
  { bg: '#d8d1c3', color: '#393733', rotate: -2, fontSize: '11px', texture: '/textures/paper-white.jpg' },
  { bg: '#34322e', color: '#f4eee3', rotate: 3, fontSize: '12px', texture: null },
];

const LABEL_LETTERS = ['B', 'A', 'C', 'K'];

export default function BackButton({ href, onClick, label, className = '' }: BackButtonProps) {
  const letters = label ? label.toUpperCase().split('') : LABEL_LETTERS;

  const content = (
    <span className="inline-flex items-center gap-[2px] select-none">
      {letters.map((char, i) => {
        const style = LETTER_STYLES[i % LETTER_STYLES.length];
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center font-serif font-semibold uppercase transition-transform duration-200 group-hover:-translate-y-0.5"
            style={{
              backgroundColor: style.bg,
              backgroundImage: style.texture ? `url(${style.texture})` : undefined,
              backgroundBlendMode: style.texture ? 'multiply' : undefined,
              backgroundSize: 'cover',
              color: style.color,
              transform: `rotate(${style.rotate}deg)`,
              fontSize: style.fontSize,
              width: '22px',
              height: '26px',
              boxShadow: '0 2px 5px rgba(47, 43, 35, 0.16)',
              borderRadius: '2px 3px 2px 4px / 3px 2px 4px 2px',
              filter: 'contrast(1.02)',
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );

  const wrapperClass = `group inline-flex min-h-[44px] items-center rounded-sm px-1 py-2 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#45423d] ${className}`;

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
