import type { Metadata } from 'next';
import Image from 'next/image';
import PortfolioNav from '@/components/PortfolioNav';
import { FRIEND_LINKS, friendLinkHost } from './friends';
import styles from './links.module.css';

export const metadata: Metadata = {
  title: '友人帐',
  description: '遇你如亘古荒野忽青',
  alternates: { canonical: '/links' },
};

export default function LinksPage() {
  return (
    <div className={styles.page}>
      <PortfolioNav theme="light" />

      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.heading} aria-label="友人帐">
            <span aria-hidden="true">友</span>
            <span aria-hidden="true">人</span>
            <span aria-hidden="true">帐</span>
          </h1>
        </header>

        <ul className={styles.grid} aria-label="朋友们的网站">
          {FRIEND_LINKS.map((friend, index) => (
            <li key={friend.url} className={styles.item}>
              <a
                className={styles.card}
                href={friend.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`访问 ${friend.name} 的网站（新窗口打开）`}
              >
                <span className={styles.backing} aria-hidden="true" />
                <span className={styles.print}>
                  <span className={styles.clip} aria-hidden="true" />
                  <span className={styles.photo}>
                    <Image
                      src={friend.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 78vw, (max-width: 1100px) 42vw, 460px"
                      className={styles.photoImage}
                      preload={index === 0}
                    />
                  </span>
                  <span className={styles.caption}>
                    <strong>{friend.name}</strong>
                    <span>{friend.description}</span>
                    <small>{friendLinkHost(friend.url)}</small>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
