import type { Metadata } from 'next';
import Image from 'next/image';
import localFont from 'next/font/local';
import { FiPlus } from 'react-icons/fi';
import PortfolioNav from '@/components/PortfolioNav';
import { FRIEND_LINKS, friendLinkHost } from './friends';
import styles from './links.module.css';

const display = localFont({ src: './fonts/Anton.ttf', variable: '--font-friends-display', weight: '400', display: 'swap', adjustFontFallback: false });
const chinese = localFont({ src: './fonts/NotoSerifSC.ttf', variable: '--font-friends-cjk', weight: '500', display: 'swap', adjustFontFallback: false });

const korean = localFont({ src: './fonts/NotoSerifKR.ttf', variable: '--font-friends-kr', weight: '500', display: 'swap', adjustFontFallback: false });

export const metadata: Metadata = {
  title: '友人帐',
  description: '遇你如亘古荒野忽青',
  alternates: { canonical: '/links' },
};

function SignalBackdrop() {
  const trace = 'M104 184h80l30-32 32 75 42-126 35 83h45l37-139 60 270 42-131h82l30-36 26 69 25-33h88';
  return <div className={styles.signalBackdrop} aria-hidden="true">
    <svg viewBox="0 0 1000 360" fill="none" focusable="false">
      <defs>
        <pattern id="friends-signal-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0h6v6H0z" fill="currentColor" /><path d="M0 0v6" stroke="#141414" strokeWidth="2" /></pattern>
        <linearGradient id="friends-ecg-persistence" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".2" stopColor="#fff" stopOpacity=".03" /><stop offset=".5" stopColor="#fff" stopOpacity=".24" /><stop offset=".78" stopColor="#fff" stopOpacity=".7" /><stop offset=".93" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <mask id="friends-ecg-scan" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="360"><rect className={styles.signalScan} x="-520" y="0" width="520" height="360" fill="url(#friends-ecg-persistence)" /></mask>
        <pattern id="friends-checker" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 0h12v12H0zM12 12h12v12H12z" fill="currentColor" /></pattern>
        <linearGradient id="friends-checker-fade"><stop offset="0" stopColor="#fff" /><stop offset=".48" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <mask id="friends-checker-mask"><path d="M0 0h360v24H0z" fill="url(#friends-checker-fade)" /></mask>
      </defs>
      <path d="M12 48V16h32m912 0h32v32M12 312v32h32m944-32v32h-32" stroke="currentColor" strokeWidth="1.2" opacity=".45" />
      <path className={styles.signalHeart} d="M44 158h12v12h12v-12h12v6h6v18h-6v6h-6v6h-6v6H56v-6H50v-6H44v-6H38v-18h6Z" fill="currentColor" />
      <path className={styles.signalTrace} d={trace} stroke="currentColor" strokeWidth="3" strokeLinejoin="bevel" />
      <path className={styles.signalTail} d="M803 184h145" stroke="currentColor" strokeWidth="2" strokeDasharray="3 8" />
      <g className={styles.signalSweep} mask="url(#friends-ecg-scan)">
        <path d={trace} stroke="currentColor" strokeWidth="3.5" strokeLinejoin="bevel" />
        <path d="M803 184h145" stroke="currentColor" strokeWidth="2" strokeDasharray="3 8" />
      </g>
      <text className={styles.signalNumber} x="824" y="98" fill="url(#friends-signal-hatch)" fontSize="82" fontWeight="700" letterSpacing="-5">125</text>
      <g className={styles.checkerBand} transform="translate(43 314) skewX(-22)" mask="url(#friends-checker-mask)"><path d="M0 0h132v24H0z" fill="currentColor" /><path d="M132 0h228v24H132z" fill="url(#friends-checker)" /></g>
    </svg>
  </div>;
}

export default function LinksPage() {
  return <div className={`${styles.page} ${display.variable} ${chinese.variable} ${korean.variable}`}>
    <PortfolioNav showSections />
    <main className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.heroMeta}><span>YURIA / LINK DIRECTORY</span><span>PERSONAL CONNECTIONS</span></div>
        <div className={styles.heroTitle}>
          <SignalBackdrop />
          <h1><span className={styles.srOnly}>友人帐</span><span aria-hidden="true">FRIENDS</span></h1>
          <span className={styles.signalLabel} lang="ko">칼바람</span>
        </div>
        <p className={styles.heroFoot}>IN GOOD COMPANY.</p>
      </header>

      <section className={styles.directory} aria-labelledby="directory-title">
        <div className={styles.sectionTop}>
          <h2 id="directory-title"><span>Sometimes you will never know</span>{' '}<span>the value of a moment</span>{' '}<em>until it becomes a memory.</em></h2>
          <span>{String(FRIEND_LINKS.length).padStart(2, '0')} / {FRIEND_LINKS.length === 1 ? 'CONNECTED SITE' : 'CONNECTED SITES'}</span>
        </div>
        <ul className={styles.friendList} aria-label="朋友们的网站">
          {FRIEND_LINKS.map((friend, index) => <li key={friend.url} className={styles.friend}>
            <span className={styles.cardBacking} aria-hidden="true" />
            <a className={styles.friendCard} href={friend.url} target="_blank" rel="noopener noreferrer" aria-label={`访问 ${friend.name} 的网站（新窗口打开）`}>
              <span className={styles.photo}>
                <Image src={friend.image} alt="" fill sizes="(max-width: 600px) 42vw, 360px" className={styles.photoImage} preload={index === 0} />
                <span className={styles.photoTop} aria-hidden="true">FRIEND FILE / {String(index + 1).padStart(3, '0')}</span>
                <span className={styles.photoNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.photoCorner} aria-hidden="true" />
              </span>
              <span className={styles.friendInfo}>
                <strong className={styles.friendName} lang="zh-CN">{friend.name}</strong>
                <span className={styles.host}>{friendLinkHost(friend.url)}</span>
                <span className={styles.friendDescription} lang="zh-CN">{friend.description}</span>
                <span className={styles.visit}>VISIT THE SITE <span className={styles.visitIcon}><FiPlus size={18} aria-hidden="true" /></span></span>
              </span>
            </a>
          </li>)}
        </ul>
      </section>
      <footer className={styles.footer}><span>YURIA / FRIEND DIRECTORY</span><span>GOOD COMPANY, ALWAYS.</span></footer>
    </main>
  </div>;
}
