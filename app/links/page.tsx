import type { Metadata } from 'next';
import Image from 'next/image';
import PortfolioBackground from '@/components/PortfolioBackground';
import PortfolioNav from '@/components/PortfolioNav';
import { FRIEND_LINKS, friendLinkHost } from './friends';
import styles from './links.module.css';

export const metadata: Metadata = {
  title: '友人帐 · Yuria',
  description: '这里放着一些我喜欢的人，和他们自己的小站。',
  alternates: { canonical: '/links' },
};

export default function LinksPage() {
  return (
    <div className={styles.page}>
      <PortfolioBackground />
      <PortfolioNav />

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>友人帐</h1>
        </header>

        <ul className={styles.grid} aria-label="朋友们的网站">
          {FRIEND_LINKS.map((friend, index) => (
            <li key={friend.url} className={styles.item}>
              <a
                className={styles.card}
                href={friend.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`访问 ${friend.name} 的网站`}
              >
                <span className={styles.clip} aria-hidden="true" />
                <span className={styles.tape} aria-hidden="true">
                  <i />
                  <i />
                </span>

                <span className={styles.photo}>
                  <Image
                    src={friend.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 76vw, 320px"
                    className={styles.photoImage}
                    preload={index === 0}
                  />
                </span>

                <span className={styles.caption}>
                  <strong>{friend.name}</strong>
                  <span>{friend.description}</span>
                  <small>{friendLinkHost(friend.url)}</small>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
