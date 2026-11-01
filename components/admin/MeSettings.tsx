'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FiPlus, FiTrash2, FiUpload } from 'react-icons/fi';
import { createClient } from '@/utils/content/client';
import { uploadPublicMedia } from '@/utils/r2/client';
import { siteAsset } from '@/utils/siteAssets';
import { defaultMeContent, ME_CONFIG_KEY, parseMeContent, type MeContent } from '@/components/me/content';
import styles from './me-settings.module.css';

type Profile = MeContent['profile'];

export default function MeSettings() {
  const [draft, setDraft] = useState<MeContent>(() => structuredClone(defaultMeContent));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await createClient().from('site_config').select('value').eq('key', ME_CONFIG_KEY).limit(1);
        if (error) throw new Error(error.message);
        const content = parseMeContent(data?.[0]?.value);
        if (active) { setDraft(content); setLoadError(''); }
      } catch { if (active) setLoadError('读取未完成，请重试后再编辑。'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [attempt]);

  function profile<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft(previous => ({ ...previous, profile: { ...previous.profile, [key]: value } }));
    setMessage('');
  }
  function pageText(topicIndex: number, pageIndex: number, value: string) {
    setDraft(previous => ({ ...previous, topics: previous.topics.map((topic, i) => i === topicIndex ? { ...topic, pages: topic.pages.map((page, j) => j === pageIndex ? value.split('\n') : page) } : topic) }));
    setMessage('');
  }

  async function upload(file: File | undefined, key: 'avatarUrl' | 'portraitUrl') {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      setError('请选择 20 MB 以内的 JPG、PNG、WebP 或 AVIF 图片。'); return;
    }
    setUploading(key); setError(''); setMessage('');
    try {
      const url = await uploadPublicMedia(file, 'portfolio/content');
      setDraft(previous => ({ ...previous, [key]: url }));
      setMessage('图片已上传，点击保存后应用到页面。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '上传未完成，请重试'); }
    finally { setUploading(''); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const content = parseMeContent(draft);
      const { error } = await createClient().from('site_config').upsert({ key: ME_CONFIG_KEY, value: JSON.stringify(content) }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
      setMessage('已保存。刷新 me 页面就能看到更新。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存未完成，请重试'); }
    finally { setSaving(false); }
  }

  return <div className={styles.editor}>
    <header className={styles.heading}><div><span>PERSONAL PAGE / ME</span><h1>关于我</h1><p>修改个人主页与文游对白，保存后即可生效。</p></div><Link href="/me" target="_blank" rel="noopener noreferrer">查看页面</Link></header>
    {loading ? <p role="status">正在读取内容…</p> : loadError ? <div role="alert"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>重新读取</button></div> : <form onSubmit={save}>
      <fieldset disabled={saving || Boolean(uploading)}>
        <section className={styles.section}><h2>个人资料</h2><div className={styles.columns}>
          <label>名字<input value={draft.profile.name} maxLength={60} required onChange={event => profile('name', event.target.value)} /></label>
          <label>称呼<input value={draft.profile.alias} maxLength={60} required onChange={event => profile('alias', event.target.value)} /></label>
        </div>
          <label>一句话／诗句<textarea rows={3} value={draft.profile.quote.join('\n')} onChange={event => profile('quote', event.target.value.split('\n'))} /><small>每行对应页面里的一行，最多 4 行。</small></label>
          <label>简短介绍<input value={draft.profile.bio} maxLength={200} onChange={event => profile('bio', event.target.value)} /></label>
          <label>关键词<input value={draft.profile.tags.join('、')} onChange={event => profile('tags', event.target.value.split(/[、,，]/))} /><small>用顿号或逗号分隔，最多 8 个。</small></label>
        </section>
        <section className={styles.section}><h2>头像与立绘</h2><div className={styles.columns}>
          {(['avatarUrl', 'portraitUrl'] as const).map(key => <div key={key} className={styles.asset}>
            <div className={styles.imagePreview}><img src={siteAsset(draft[key])} alt={key === 'avatarUrl' ? '头像预览' : '立绘预览'} /></div>
            <label htmlFor={`me-${key}`}>{key === 'avatarUrl' ? '头像地址' : '立绘地址'}</label><input id={`me-${key}`} value={draft[key]} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} />
            <label className={styles.upload}><FiUpload size={15} aria-hidden="true" /><span>{uploading === key ? '正在上传…' : '上传图片'}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" aria-label={key === 'avatarUrl' ? '上传头像' : '上传立绘'} onChange={event => { void upload(event.target.files?.[0], key); event.target.value = ''; }} /></label>
          </div>)}
        </div><p className={styles.help}>立绘建议使用透明背景 PNG 或 WebP，头像按圆形展示。图片上传后仍需保存。</p></section>
        <section className={styles.section}><h2>主页内容</h2>
          <label>偏爱<textarea rows={4} value={draft.profile.favorites} maxLength={1500} onChange={event => profile('favorites', event.target.value)} /></label>
          <label>关于<textarea rows={4} value={draft.profile.about} maxLength={1500} onChange={event => profile('about', event.target.value)} /></label>
          <label>给来访者的短信<textarea rows={4} value={draft.profile.note} maxLength={600} onChange={event => profile('note', event.target.value)} /></label>
          <label>短信下方的小句子<input value={draft.profile.noteReply} maxLength={100} onChange={event => profile('noteReply', event.target.value)} /></label>
        </section>
        <section className={styles.section}><h2>开场对白</h2><label>初次见面时说的话<textarea rows={5} value={draft.greeting.join('\n')} onChange={event => setDraft(previous => ({ ...previous, greeting: event.target.value.split('\n') }))} /><small>最多 5 行，每行最多 180 字。</small></label></section>
        <section className={styles.section}><div className={styles.row}><h2>话题与对白</h2><button type="button" disabled={draft.topics.length >= 8} onClick={() => setDraft(previous => ({ ...previous, topics: [...previous.topics, { id: crypto.randomUUID(), label: '新的话题', pages: [['']] }] }))}><FiPlus size={16} aria-hidden="true" />新增话题</button></div>
          {draft.topics.map((topic, topicIndex) => <article key={topic.id} className={styles.topic}>
            <div className={styles.row}><h3>话题 {topicIndex + 1}</h3><button type="button" aria-label={`删除话题 ${topicIndex + 1}`} onClick={() => setDraft(previous => ({ ...previous, topics: previous.topics.filter(item => item.id !== topic.id) }))}><FiTrash2 size={15} aria-hidden="true" /><span>删除话题</span></button></div>
            <label>选项文字<input value={topic.label} required maxLength={80} onChange={event => setDraft(previous => ({ ...previous, topics: previous.topics.map(item => item.id === topic.id ? { ...item, label: event.target.value } : item) }))} /></label>
            {topic.pages.map((page, pageIndex) => <div key={pageIndex} className={styles.pageField}>
              <label>第 {pageIndex + 1} 页对白<textarea rows={4} value={page.join('\n')} maxLength={404} onChange={event => pageText(topicIndex, pageIndex, event.target.value)} /></label>
              {topic.pages.length > 1 && <button type="button" aria-label={`删除话题 ${topicIndex + 1} 第 ${pageIndex + 1} 页`} onClick={() => setDraft(previous => ({ ...previous, topics: previous.topics.map(item => item.id === topic.id ? { ...item, pages: item.pages.filter((_, i) => i !== pageIndex) } : item) }))}>删除这一页</button>}
            </div>)}
            <button type="button" disabled={topic.pages.length >= 8} onClick={() => setDraft(previous => ({ ...previous, topics: previous.topics.map(item => item.id === topic.id ? { ...item, pages: [...item.pages, ['']] } : item) }))}><FiPlus size={15} aria-hidden="true" />新增一页对白</button>
          </article>)}
          <p className={styles.help}>每个话题最多 8 页，每页最多 400 字；NEXT 会依次翻页，结束后返回话题选项。</p>
        </section>
      </fieldset>
      <footer className={styles.saveBar}>{error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status">{message}</p>}<button type="submit" disabled={saving || Boolean(uploading)}>{saving ? '保存中…' : '保存关于我'}</button></footer>
    </form>}
  </div>;
}
