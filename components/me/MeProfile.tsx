'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiCheck, FiGrid, FiHeart, FiLoader, FiPlus, FiUser, FiX } from 'react-icons/fi';
import { siteAsset } from '@/utils/siteAssets';
import { meMoments, type MeContent } from './content';
import { editable, type MeEditor } from './editing';
import styles from './me.module.css';

const tabs = [
  { id: 'moments', label: '影像', icon: FiGrid },
  { id: 'favorites', label: '偏爱', icon: FiHeart },
  { id: 'about', label: '关于', icon: FiUser },
] as const;
type TabId = typeof tabs[number]['id'];

export default function MeProfile({ content, editor }: { content: MeContent; editor?: MeEditor }) {
  const [tab, setTab] = useState<TabId>('moments');
  const { profile } = content;

  return <section id="me-profile" className={styles.profile} aria-labelledby="me-name">
    <div className={styles.phone}>
      <div className={styles.profileTop}><Link href={editor ? '/admin' : '/'} aria-label={editor ? 'yuria，返回设置' : 'yuria，返回主页'}>yuria</Link>{editor ? <div className={styles.editActions}>
        <button type="button" aria-label="取消编辑" title="取消编辑" disabled={editor.busy} onClick={editor.onCancel}><FiX size={19} /></button>
        <button type="button" aria-label="保存主页" title="保存主页" disabled={editor.busy || !editor.dirty} onClick={editor.onSave}>{editor.busy ? <FiLoader size={19} className={styles.editSpinner} /> : <FiCheck size={19} />}</button>
      </div> : <span>PERSONAL PAGE</span>}</div>
      <div className={styles.phoneContent}>
      <header className={styles.identity}>
        <img className={styles.avatar} src={siteAsset(content.avatarUrl)} alt={`${profile.alias}的头像`} width={112} height={112} fetchPriority="high" {...editable(editor, { kind: 'image', field: 'avatarUrl' }, '头像')} />
        <div><h1 id="me-name" {...editable(editor, { kind: 'text', field: 'name' }, '名字')}>{profile.name}</h1><p lang="ja" {...editable(editor, { kind: 'text', field: 'alias' }, '称呼')}>{profile.alias}</p></div>
      </header>
      <div className={styles.bio}>
        <p className={styles.quote} {...editable(editor, { kind: 'text', field: 'quote' }, '诗句')}>{profile.quote.map((line, i) => <span key={i}>{line}</span>)}</p>
        <p className={styles.bioLine} {...editable(editor, { kind: 'text', field: 'bio' }, '简短介绍')}>{profile.bio}</p>
        <ul className={styles.tags} aria-label="关于我的关键词" {...editable(editor, { kind: 'text', field: 'tags' }, '关键词')}>{profile.tags.map((tag, i) => <li key={i}>{tag}</li>)}</ul>
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
          {meMoments(content).map((item, index) => item.kind === 'image' ? <img key={index} src={siteAsset(item.value)} alt={`相册影像 ${index + 1}`} width={280} height={280} className={item.value === content.portraitUrl ? styles.momentPortrait : undefined} {...editable(editor, { kind: 'album', index }, `相册第 ${index + 1} 项`)} /> : <div key={index} className={styles.poemTile} {...editable(editor, { kind: 'album', index }, `相册第 ${index + 1} 项`)}><span>WORDS / ME</span><p>{item.value}</p><span>IN MY OWN TIME.</span></div>)}
          {editor && meMoments(content).length === 0 && <button type="button" className={styles.addMoment} aria-label="编辑相册" onClick={() => editor.onEdit({ kind: 'album' })}><FiPlus size={22} /><span>相册</span></button>}
        </div> : id === 'favorites' ? <div className={styles.profileText}>
          <h2>偏爱</h2><p className={styles.preserveLines} {...editable(editor, { kind: 'text', field: 'favorites' }, '偏爱')}>{profile.favorites || (editor ? '点击填写偏爱' : '')}</p>
        </div> : <div className={styles.profileText}>
          <h2>你好，我是{profile.alias}。</h2><p className={styles.preserveLines} {...editable(editor, { kind: 'text', field: 'about' }, '关于')}>{profile.about || (editor ? '点击填写自我介绍' : '')}</p>
        </div>}
      </div>)}
      <aside className={styles.note} aria-label="一段小对话"><p className={styles.preserveLines} {...editable(editor, { kind: 'text', field: 'note' }, '给来访者的短信')}>{profile.note || (editor ? '点击填写短信' : '')}</p><span className={styles.noteReply} {...editable(editor, { kind: 'text', field: 'noteReply' }, '小句子')}>{profile.noteReply || (editor ? '点击填写小句子' : '')}</span></aside>
      <div className={styles.profileFoot} aria-hidden="true"><span>YURIA / PERSONAL SPACE</span><i /></div>
      </div>
    </div>
  </section>;
}
