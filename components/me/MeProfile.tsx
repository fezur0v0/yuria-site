'use client';

import { lazy, Suspense } from 'react';
import Link from 'next/link';
import { FiPlus, FiImage } from 'react-icons/fi';
import { BsChatDots, BsPencilSquare } from 'react-icons/bs';
import { siteAsset } from '@/utils/siteAssets';
import { meFrameStyle, mePhotoSlots, type MeContent } from './content';
import { editable, type MeEditor } from './editing';
import styles from './me.module.css';

const PhotoWallEditor = lazy(() => import('@/components/admin/MePhotoWallEditor'));

export default function MeProfile({ content, editor, onDialogue }: { content: MeContent; editor?: MeEditor; onDialogue: () => void }) {
  const { profile } = content;
  const photoWall = <div className={styles.moments}>{mePhotoSlots(content).map((url, index) => <div key={index} className={url ? styles.photoCell : styles.emptyMoment} aria-hidden={url ? undefined : true}>{url && <img src={siteAsset(url)} alt={`相册影像 ${index + 1}`} width={280} height={280} style={meFrameStyle(content.frames?.photos?.[index])} className={url === content.portraitUrl ? styles.momentPortrait : undefined} />}</div>)}</div>;

  return <section id="me-profile" tabIndex={-1} className={styles.profile} aria-labelledby="me-name">
    <div className={styles.phone}>
      <div className={styles.phoneContent}>
      <div className={styles.profileCover} {...editable(editor, { kind: 'image', field: 'coverUrl' }, '封面')}>{content.coverUrl && <img src={siteAsset(content.coverUrl)} alt="" style={meFrameStyle(content.frames?.coverUrl)} />}{editor && <FiImage className={styles.coverEditIcon} size={18} aria-hidden="true" />}</div>
      <div className={styles.profileSheet}>
      <header className={styles.identity}>
        <div className={styles.avatarGroup}><div className={styles.avatar} {...editable(editor, { kind: 'image', field: 'avatarUrl' }, '头像')}><div className={styles.avatarWindow}><img src={siteAsset(content.avatarUrl)} alt={`${profile.alias}的头像`} width={112} height={112} fetchPriority="high" style={meFrameStyle(content.frames?.avatarUrl)} /></div></div>{!editor && <Link href="/admin/me" className={styles.avatarEdit} aria-label="编辑主页"><FiPlus size={16} aria-hidden="true" /></Link>}</div>
        <div className={styles.identityNames}><h1 id="me-name" lang="ja" {...editable(editor, { kind: 'text', field: 'alias' }, '称呼')}>{profile.alias}</h1><p {...editable(editor, { kind: 'text', field: 'name' }, '名字')}>@{profile.name}</p></div>
      </header>
      <div className={styles.profileActions}>
        <button type="button" aria-label="Message，进入对话" disabled={editor?.busy} onClick={onDialogue}><BsChatDots size={17} aria-hidden="true" />Message</button>
        {editor ? <button type="button" onClick={() => editor.onEdit({ kind: 'text', field: 'about' })} disabled={editor.busy}><BsPencilSquare size={16} aria-hidden="true" />Edit</button> : <Link href="/admin/me"><BsPencilSquare size={16} aria-hidden="true" />Edit</Link>}
      </div>
      <div className={styles.photoWallSection}>{editor ? <Suspense fallback={photoWall}><PhotoWallEditor content={content} editor={editor} /></Suspense> : photoWall}</div>
      <div className={styles.bio}>
        <p className={styles.quote} {...editable(editor, { kind: 'text', field: 'quote' }, '个性签名')}>{profile.quote.map((line, i) => <span key={i}>{line}</span>)}</p>
        <p className={styles.bioLine} {...editable(editor, { kind: 'text', field: 'bio' }, '装饰')}>{profile.bio}</p>
        <ul className={styles.tags} aria-label="标签" {...editable(editor, { kind: 'text', field: 'tags' }, '标签')}>{profile.tags.map((tag, i) => <li key={i}>{tag}</li>)}</ul>
      </div>
      {(profile.about || editor) && <div className={styles.profileText}><h2>About me</h2><p className={styles.preserveLines} {...editable(editor, { kind: 'text', field: 'about' }, 'About me')}>{profile.about || '点击填写自我介绍'}</p></div>}
      {(profile.favorites || editor) && <div className={styles.profileText}><h2>Likes</h2><p className={styles.preserveLines} {...editable(editor, { kind: 'text', field: 'favorites' }, 'Likes')}>{profile.favorites || '点击填写 Likes'}</p></div>}
      <div className={styles.profileBottom}>
      <aside className={styles.note} aria-label="一段小对话"><p className={styles.preserveLines} {...editable(editor, { kind: 'text', field: 'note' }, '祂说')}>{profile.note || (editor ? '点击填写祂说' : '')}</p><span className={styles.noteReply} {...editable(editor, { kind: 'text', field: 'noteReply' }, '祂说')}>{profile.noteReply || (editor ? '点击填写祂说' : '')}</span></aside>

      </div>
      </div>
      </div>
    </div>
  </section>;
}
