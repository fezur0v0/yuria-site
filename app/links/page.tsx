import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
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

function SignalStamp() {
  return <div className={styles.signalMark}>
    <svg viewBox="0 0 280 150" fill="none" aria-hidden="true" focusable="false">
      <defs><pattern id="friends-signal-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0h4v4H0z" fill="currentColor" /><path d="M0 0v4" stroke="#141414" strokeWidth="1.2" /></pattern></defs>
      <path d="M15 28V15h14m222 0h14v13M15 110v26h14m236-26v26h-14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M28 29h7m4 0h3m4 0h11M27 108v6m6-6v6m6-6v6m6-6v6m6-6v6m6-6v6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M32 56h8v4h4v-4h8v4h4v12h-4v4h-4v4h-4v4h-4v-4h-4v-4h-4v-4h-4V60h4Z" fill="url(#friends-signal-hatch)" />
      <path d="M64 67h13l7-10 9 26 12-48 17 70 10-38h27" stroke="currentColor" strokeWidth="2.2" />
      <path d="M164 67h77" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />
      <text x="189" y="50" fill="url(#friends-signal-hatch)" fontSize="38" fontWeight="700" letterSpacing="-3">125</text>
      <path d="M29 121h214v10H29z" fill="url(#friends-signal-hatch)" />
      <path d="M249 116v18m5-11v11m5-16v16" stroke="currentColor" strokeWidth="1.3" />
    </svg>
    <span className={styles.signalLabel} lang="ko">칼바람</span>
  </div>;
}

export default function LinksPage() {
  return <div className={`${styles.page} ${display.variable} ${chinese.variable} ${korean.variable}`}>
    <PortfolioNav showSections />
    <main className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.heroMeta}><span>YURIA / LINK DIRECTORY</span><span>PERSONAL CONNECTIONS</span></div>
        <div className={styles.heroTitle}>
          <h1><span className={styles.srOnly}>友人帐</span><span aria-hidden="true">FRIENDS</span></h1>
          <SignalStamp />
        </div>
        <p className={styles.heroFoot}>IN GOOD COMPANY.</p>
      </header>

      <section className={styles.directory} aria-labelledby="directory-title">
        <div className={styles.sectionTop}>
          <div><h2 id="directory-title">THE DIRECTORY</h2><p>CHOSEN, NOT COLLECTED.</p></div>
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
      <footer className={styles.footer}><span>YURIA / FRIEND DIRECTORY</span><Link href="/">back</Link><span>GOOD COMPANY, ALWAYS.</span></footer>
    </main>
  </div>;
}
