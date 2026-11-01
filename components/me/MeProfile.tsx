'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiGrid, FiHeart, FiUser } from 'react-icons/fi';
import { siteAsset } from '@/utils/siteAssets';
import type { MeContent } from './content';
import styles from './me.module.css';

const tabs = [
  { id: 'moments', label: '影像', icon: FiGrid },
  { id: 'favorites', label: '偏爱', icon: FiHeart },
  { id: 'about', label: '关于', icon: FiUser },
] as const;
type TabId = typeof tabs[number]['id'];

export default function MeProfile({ content }: { content: MeContent }) {
  const [tab, setTab] = useState<TabId>('moments');
  const { profile } = content;

  return <section id="me-profile" className={styles.profile} aria-labelledby="me-name">
    <div className={styles.phone}>
      <div className={styles.profileTop}><Link href="/" aria-label="yuria，返回主页">yuria</Link><span>PERSONAL PAGE</span></div>
      <div className={styles.phoneContent}>
      <header className={styles.identity}>
        <img className={styles.avatar} src={siteAsset(content.avatarUrl)} alt={`${profile.alias}的头像`} width={112} height={112} fetchPriority="high" />
        <div><h1 id="me-name">{profile.name}</h1><p lang="ja">{profile.alias}</p><span>@yuria</span></div>
      </header>
      <div className={styles.bio}>
        <p className={styles.quote}>{profile.quote.map(line => <span key={line}>{line}</span>)}</p>
        <p className={styles.bioLine}>{profile.bio}</p>
        <ul className={styles.tags} aria-label="关于我的关键词">{profile.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div className={styles.profileTabs} role="tablist" aria-label="个人主页内容">
        {tabs.map(({ id, label, icon: Icon }, index) => <button key={id} id={`me-tab-${id}`} role="tab" type="button" aria-label={label} title={label} aria-selected={tab === id} aria-controls={`me-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={event => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault(); setTab(tabs[next].id);
          document.getElementById(`me-tab-${tabs[next].id}`)?.focus();
        }}><Icon size={20} aria-hidden="true" /></button>)}
      </div>
      {tabs.map(({ id }) => <div key={id} role="tabpanel" id={`me-panel-${id}`} aria-labelledby={`me-tab-${id}`} hidden={tab !== id} tabIndex={0} className={styles.profilePanel}>
        {id === 'moments' ? <div className={styles.moments}>
          <img src={siteAsset(content.avatarUrl)} alt="收藏一张小小肖像" width={280} height={280} />
          <div className={styles.poemTile}><span>WORDS / ME</span><p>{profile.quote.at(-1)}</p><span>IN MY OWN TIME.</span></div>
          <img src={siteAsset(content.portraitUrl)} alt="我的立绘" width={280} height={280} className={styles.momentPortrait} />
        </div> : id === 'favorites' ? <div className={styles.profileText}>
          <span className={styles.eyebrow}>LITTLE THINGS I LOVE</span><h2>偏爱</h2><p className={styles.preserveLines}>{profile.favorites}</p>
        </div> : <div className={styles.profileText}>
          <span className={styles.eyebrow}>A LITTLE ABOUT ME</span><h2>你好，我是{profile.alias}。</h2><p className={styles.preserveLines}>{profile.about}</p>
        </div>}
      </div>)}
      <aside className={styles.note} aria-label="给来访者的一封短信"><span className={styles.eyebrow}>A NOTE FOR YOU</span><p className={styles.preserveLines}>{profile.note}</p><span className={styles.noteReply}>{profile.noteReply}</span></aside>
      <div className={styles.profileFoot} aria-hidden="true"><span>YURIA / PERSONAL SPACE</span><i /></div>
      </div>
    </div>
  </section>;
}
