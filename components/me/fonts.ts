import { Noto_Serif_SC } from 'next/font/google';

export const meMincho = Noto_Serif_SC({
  weight: '400', subsets: ['latin'], display: 'swap', preload: false,
  adjustFontFallback: false, variable: '--font-me-mincho',
});
