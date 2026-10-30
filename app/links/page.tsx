import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import localFont from 'next/font/local';
import { FiPlus } from 'react-icons/fi';
import PortfolioNav from '@/components/PortfolioNav';
import { siteAsset } from '@/utils/siteAssets';
import { FRIEND_LINKS, friendLinkHost } from './friends';
import CopySiteLink from './CopySiteLink';
import styles from './links.module.css';

const display = localFont({ src: './fonts/Anton.ttf', variable: '--font-friends-display', weight: '400', display: 'swap', adjustFontFallback: false });
const chinese = localFont({ src: './fonts/NotoSerifSC.ttf', variable: '--font-friends-cjk', weight: '500', display: 'swap', adjustFontFallback: false });

export const metadata: Metadata = {
  title: '友人帐',
  description: '遇你如亘古荒野忽青',
  alternates: { canonical: '/links' },
};

function ConnectionMap() {
  return <svg className={styles.connectionMap} viewBox="0 0 1000 400" fill="none" aria-hidden="true">
    <path d="M-20 300 345 34l270 332 420-290M18 60l865 297M150 400 610-20M-10 220h1040M345-20v440M760-20v440M-10 94h1040M140-20v440" stroke="currentColor" strokeWidth=".65" />
    <path d="m238 291 107-257 86 125-193 132 377 75 145-272-329 65 452 198" stroke="currentColor" strokeWidth=".65" />
    <path d="M336 25h18v18h-18zM422 150h18v18h-18zM606 357h18v18h-18zM751 85h18v18h-18zM229 282h18v18h-18z" fill="currentColor" />
    <path d="M321 10h48v48h-48zM591 342h48v48h-48zM736 70h48v48h-48z" stroke="currentColor" strokeWidth=".8" />
  </svg>;
}

export default function LinksPage() {
  return <div className={`${styles.page} ${display.variable} ${chinese.variable}`}>
    <PortfolioNav showSections />
    <main className={styles.main}>
      <header className={styles.hero}>
        <ConnectionMap />
        <div className={styles.heroMeta}><span>YURIA / LINK DIRECTORY</span><span>PERSONAL CONNECTIONS</span></div>
        <div className={styles.heroTitle}>
          <h1><span className={styles.srOnly}>友人帐</span><span aria-hidden="true">FRIENDS</span></h1>
          <span className={styles.titleCross} aria-hidden="true"><i /><i /></span>
        </div>
        <div className={styles.heroBottom}>
          <p lang="zh-CN">遇你如亘古荒野忽青</p>
          <a href="#friend-files" className={styles.explore}>MEET THE NEIGHBOURS <FiPlus size={15} aria-hidden="true" /></a>
        </div>
        <div className={styles.heroFoot} aria-hidden="true"><span className={styles.slashStrip} /><span>IN GOOD COMPANY.</span><span className={styles.heroRule} /></div>
      </header>

      <section id="friend-files" className={styles.directory} aria-labelledby="directory-title">
        <div className={styles.sectionTop}><h2 id="directory-title">THE DIRECTORY</h2><span>{String(FRIEND_LINKS.length).padStart(2, '0')} / {FRIEND_LINKS.length === 1 ? 'CONNECTED SITE' : 'CONNECTED SITES'}</span></div>
        <div className={styles.directoryLayout}>
          <aside className={styles.editorial}>
            <span className={styles.eyebrow}>CHOSEN, NOT COLLECTED.</span>
            <p className={styles.editorialTitle}>Different <br />worlds.<br /><em>Same <br />wavelength.</em></p>
            <p className={styles.editorialChinese} lang="zh-CN">一些喜欢的小小世界。</p>
            <div className={styles.editorialNote}><span aria-hidden="true">+</span><p>Independent places.<br />A little room for each other.</p></div>
            <div className={styles.miniRuler} aria-hidden="true"><i /><i /><i /><i /><i /><span>OPEN / CONNECT</span></div>
          </aside>
          <ul className={styles.friendList} aria-label="朋友们的网站">
            {FRIEND_LINKS.map((friend, index) => <li key={friend.url} className={styles.friend}>
              <span className={styles.cardBacking} aria-hidden="true" />
              <a className={styles.friendCard} href={friend.url} target="_blank" rel="noopener noreferrer" aria-label={`访问 ${friend.name} 的网站（新窗口打开）`}>
                <span className={styles.photo}>
                  <Image src={friend.image} alt="" fill sizes="(max-width: 640px) 86vw, (max-width: 1000px) 54vw, 440px" className={styles.photoImage} preload={index === 0} />
                  <span className={styles.photoTop} aria-hidden="true">FRIEND FILE / {String(index + 1).padStart(3, '0')}</span>
                  <span className={styles.photoNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.photoCorner} aria-hidden="true" />
                </span>
                <span className={styles.friendInfo}>
                  <span className={styles.cardMeta}>A PLACE WORTH KEEPING</span>
                  <strong className={styles.friendName} lang="zh-CN">{friend.name}</strong>
                  <span className={styles.host}>{friendLinkHost(friend.url)}</span>
                  <span className={styles.friendDescription} lang="zh-CN">{friend.description}</span>
                  <span className={styles.visit}>VISIT THE SITE <span className={styles.visitIcon}><FiPlus size={18} aria-hidden="true" /></span></span>
                  <span className={styles.cardBottom} aria-hidden="true"><span className={styles.barcode} /><small>YURIA / {String(index + 1).padStart(3, '0')}<br />INDEPENDENT WEBSITE</small></span>
                </span>
              </a>
              <div className={styles.cardCaption}><span>FILE / {String(index + 1).padStart(3, '0')}</span><span>{friendLinkHost(friend.url)}</span></div>
            </li>)}
          </ul>
        </div>
      </section>

      <section className={styles.exchange} aria-labelledby="exchange-title">
        <div className={styles.exchangeIntro}><span className={styles.eyebrow}>FOR THE OTHER SIDE</span><h2 id="exchange-title">Keep in <br /><em>touch.</em></h2></div>
        <div className={styles.siteCard}>
          <div className={styles.siteCardTop}><span>THIS LITTLE CORNER</span><span aria-hidden="true">[ Y / XIN ]</span></div>
          <div className={styles.siteIdentity}><Image src={siteAsset('/icon.png')} alt="" width={60} height={60} className={styles.siteIcon} /><div><strong>Yuria</strong><a href="https://www.yuria.xin/">www.yuria.xin</a></div></div>
          <p lang="zh-CN">遇你如亘古荒野忽青</p>
          <CopySiteLink />
        </div>
        <div className={styles.exchangeGraphic} aria-hidden="true"><span /><span /><span /><i /></div>
      </section>
      <footer className={styles.footer}><span>YURIA / FRIEND DIRECTORY</span><Link href="/">back</Link><span>GOOD COMPANY, ALWAYS.</span></footer>
    </main>
  </div>;
}
