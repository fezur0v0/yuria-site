import type { Metadata } from 'next';
import Image from 'next/image';
import PortfolioNav from '@/components/PortfolioNav';
import { FRIEND_LINKS, friendLinkHost, type FriendLink } from './friends';
import styles from './links.module.css';

export const metadata: Metadata = {
  title: '友人帐 · Yuria',
  description: '这里放着一些我喜欢的人，和他们自己的小站。',
  alternates: { canonical: '/links' },
};

function FriendPolaroid({ friend, featured = false }: { friend: FriendLink; featured?: boolean }) {
  return (
    <a
      className={featured ? styles.polaroid : styles.smallPolaroid}
      href={friend.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`访问 ${friend.name} 的网站`}
    >
      <span className={styles.photo}>
        <Image
          src={friend.image}
          alt=""
          fill
          sizes={featured ? '(max-width: 640px) 78vw, 430px' : '(max-width: 640px) 72vw, 280px'}
          className={styles.photoImage}
          preload={featured}
        />
      </span>
      <span className={styles.caption}>
        <span className={styles.captionName}>{friend.name}</span>
        <span className={styles.captionNumber}>{featured ? 'no. 01' : friendLinkHost(friend.url)}</span>
      </span>
    </a>
  );
}

export default function LinksPage() {
  const [featured, ...moreFriends] = FRIEND_LINKS;

  return (
    <div className={styles.page}>
      <PortfolioNav theme="light" />

      <main className={styles.scrapbook}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>friend links</p>
          <h1>友人帐</h1>
          <p>这里放着一些我喜欢的人，和他们自己的小站。</p>
        </header>

        {featured && (
          <section className={styles.feature} aria-labelledby="featured-friend">
            <div className={styles.stack}>
              <span className={styles.backPaper} aria-hidden="true" />
              <span className={styles.backNavy} aria-hidden="true" />
              <span className={styles.tape} aria-hidden="true" />
              <span className={`${styles.star} ${styles.starGold}`} aria-hidden="true">✦</span>
              <span className={`${styles.star} ${styles.starPink}`} aria-hidden="true">✦</span>
              <FriendPolaroid friend={featured} featured />
            </div>

            <div className={styles.details}>
              <p className={styles.number}>NO. 01&nbsp;&nbsp;/&nbsp;&nbsp;FIRST MEETING</p>
              <h2 id="featured-friend">{featured.name}</h2>
              <p className={styles.description}>{featured.description}</p>
              <a
                className={styles.visit}
                href={featured.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {friendLinkHost(featured.url)} <span aria-hidden="true">↗</span>
              </a>

              <div className={styles.handNote} aria-hidden="true">
                <span>第一个把网址写在这里的人</span>
                <svg viewBox="0 0 86 40">
                  <path d="M82 9C58 2 37 8 20 25M20 25l5-11M20 25l12 2" />
                </svg>
              </div>

              <div className={styles.waitingNote}>
                <span className={styles.waitingSpark} aria-hidden="true">✦</span>
                <span>下一次相遇</span>
                <small>正在等待中</small>
              </div>
            </div>
          </section>
        )}

        {moreFriends.length > 0 && (
          <section className={styles.more} aria-label="更多友链">
            {moreFriends.map((friend) => (
              <FriendPolaroid key={friend.url} friend={friend} />
            ))}
          </section>
        )}

        <footer className={styles.footer}>
          <span>© yuria.xin</span>
          <span className={styles.footerLine} aria-hidden="true" />
          <span>慢慢收集</span>
        </footer>
      </main>
    </div>
  );
}
