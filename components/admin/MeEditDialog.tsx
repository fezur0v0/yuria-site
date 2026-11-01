'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FiImage, FiPlus, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import { uploadPublicMedia } from '@/utils/r2/client';
import { siteAsset } from '@/utils/siteAssets';
import { mePhotoSlots, parseMeContent, type MeContent } from '@/components/me/content';
import type { DialoguePosition, MeEditTarget } from '@/components/me/editing';
import styles from './me-settings.module.css';

const textLabels: Record<keyof MeContent['profile'], string> = { name: '名字', alias: '称呼', quote: '个性签名', bio: '装饰', tags: '标签', note: '祂说', noteReply: '祂说', favorites: 'likes', about: 'ABOUT ME' };
const limits: Record<keyof MeContent['profile'], number> = { name: 60, alias: 60, quote: 403, bio: 200, tags: 200, note: 600, noteReply: 100, favorites: 1500, about: 1500 };

function ImageField({ value, label, onChange, onUpload }: { value: string; label: string; onChange: (value: string) => void; onUpload: (file: File) => void }) {
  const safe = /^https:\/\//i.test(value) || /^\/(?!\/)/.test(value);
  return <div>
    <div className={styles.imagePreview}>{safe ? <img src={siteAsset(value)} alt={`${label}预览`} /> : <FiImage size={30} aria-hidden="true" />}</div>
    <label className={styles.upload}><FiUpload size={16} aria-hidden="true" /><span>上传图片</span><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" aria-label={`上传${label}`} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ''; }} /></label>
    <label>图片地址<input value={value} inputMode="url" placeholder="也可以粘贴图片地址" onChange={event => onChange(event.target.value)} /></label>
  </div>;
}

export default function MeEditDialog({ content, target, onClose, onApply }: {
  content: MeContent; target: MeEditTarget; onClose: () => void; onApply: (content: MeContent, dialogue?: DialoguePosition) => void;
}) {
  const [pending, setPending] = useState<MeContent>(() => structuredClone(content));
  const [textValue, setTextValue] = useState(() => { if (target.kind !== 'text') return ''; const value = content.profile[target.field]; return Array.isArray(value) ? value.join(target.field === 'tags' ? '、' : '\n') : value; });
  const [selectedMoment, setSelectedMoment] = useState(target.kind === 'album' ? target.index ?? 0 : 0);
  const [topicId, setTopicId] = useState<string | undefined>(target.kind === 'dialogue' ? target.topicId : undefined);
  const [pageIndex, setPageIndex] = useState(target.kind === 'dialogue' ? target.pageIndex : 0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const photos = mePhotoSlots(pending);
  const topic = pending.topics.find(item => item.id === topicId);
  const page = Math.min(pageIndex, topic ? topic.pages.length - 1 : 0);
  const title = target.kind === 'text' ? `编辑${textLabels[target.field]}` : target.kind === 'image' ? `编辑${target.field === 'avatarUrl' ? '头像' : target.field === 'portraitUrl' ? '立绘' : '背景'}` : target.kind === 'album' ? '编辑相册' : '编辑对白';

  useEffect(() => {
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLElement>('textarea, input:not([type="file"]), select')?.focus();
  }, []);

  function updateImage(value: string) {
    if (target.kind === 'image') setPending(previous => ({ ...previous, [target.field]: value }));
    else setPending(previous => ({ ...previous, moments: mePhotoSlots(previous).map((url, i) => ({ kind: 'image', value: i === selectedMoment ? value : url })) }));
  }
  async function upload(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 20 * 1024 * 1024) { setError('请选择 20 MB 以内的 JPG、PNG、WebP 或 AVIF 图片。'); return; }
    setUploading(true); setError('');
    try { updateImage(await uploadPublicMedia(file, 'portfolio/content')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '上传未完成，请重试'); }
    finally { setUploading(false); }
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = structuredClone(pending);
      if (target.kind === 'text') {
        const field = target.field;
        if (field === 'quote') next.profile.quote = textValue ? textValue.split('\n') : [];
        else if (field === 'tags') next.profile.tags = textValue.split(/[、,，\n]/).map(item => item.trim()).filter(Boolean);
        else next.profile[field] = textValue;
      }
      const validated = parseMeContent(next);
      dialog.current?.close();
      onApply(validated, target.kind === 'dialogue' ? { topicId: topic?.id, pageIndex: page } : undefined);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '请检查填写内容'); }
  }
  function close() { if (!uploading) dialog.current?.close(); }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="me-edit-title" onClose={onClose} onCancel={event => { if (uploading) event.preventDefault(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <form onSubmit={apply}>
      <header className={styles.dialogHeader}><h2 id="me-edit-title">{title}</h2><button type="button" aria-label="关闭编辑" disabled={uploading} onClick={close}><FiX size={20} /></button></header>
      <fieldset disabled={uploading} className={styles.dialogBody}>
        {target.kind === 'text' && <label>{textLabels[target.field]}
          <textarea autoFocus rows={target.field === 'name' || target.field === 'alias' ? 2 : 5} maxLength={limits[target.field]} value={textValue} onChange={event => setTextValue(event.target.value)} />
          {target.field === 'quote' && <small>最多 4 行，每行最多 100 字。</small>}{target.field === 'tags' && <small>用顿号或逗号分隔，最多 8 个标签。</small>}
        </label>}
        {target.kind === 'image' && <><ImageField label={title.replace('编辑', '')} value={pending[target.field] ?? ''} onChange={updateImage} onUpload={file => { void upload(file); }} />{target.field === 'backgroundUrl' ? <><p className={styles.help}>背景用于文游场景。</p><button type="button" onClick={() => updateImage('')}>移除背景</button></> : target.field === 'portraitUrl' && <p className={styles.help}>透明背景 PNG 或 WebP 更适合立绘。</p>}</>}
        {target.kind === 'album' && <>
          <div className={styles.albumItems}>{photos.map((url, i) => <button type="button" key={i} aria-label={`选择相册第 ${i + 1} 项`} aria-pressed={selectedMoment === i} onClick={() => setSelectedMoment(i)}>{url ? <img src={siteAsset(url)} alt="" /> : <FiPlus size={22} aria-hidden="true" />}</button>)}</div>
          <div className={styles.row}><span>第 {selectedMoment + 1} 项</span><button type="button" disabled={!photos[selectedMoment]} onClick={() => updateImage('')}><FiTrash2 size={15} />移除</button></div>
          <ImageField label="相册图片" value={photos[selectedMoment]} onChange={updateImage} onUpload={file => { void upload(file); }} />
        </>}
        {target.kind === 'dialogue' && <>
          <label>choose<select value={topic ? `topic:${topic.id}` : 'greeting'} onChange={event => { setTopicId(event.target.value === 'greeting' ? undefined : event.target.value.slice(6)); setPageIndex(0); }}><option value="greeting">开场对白</option>{pending.topics.map(item => <option key={item.id} value={`topic:${item.id}`}>{item.label}</option>)}</select></label>
          {topic && <><label>选项文字<input value={topic.label} maxLength={80} onChange={event => setPending(previous => ({ ...previous, topics: previous.topics.map(item => item.id === topic.id ? { ...item, label: event.target.value } : item) }))} /></label><label>对白页码<select value={page} onChange={event => setPageIndex(Number(event.target.value))}>{topic.pages.map((_, i) => <option value={i} key={i}>第 {i + 1} 页</option>)}</select></label></>}
          <label>{topic ? `第 ${page + 1} 页对白` : '开场对白'}<textarea rows={6} maxLength={topic ? 404 : 904} value={(topic ? topic.pages[page] : pending.greeting).join('\n')} onChange={event => { const lines = event.target.value.split('\n'); setPending(previous => topic ? { ...previous, topics: previous.topics.map(item => item.id === topic.id ? { ...item, pages: item.pages.map((value, i) => i === page ? lines : value) } : item) } : { ...previous, greeting: lines }); }} /></label>
        </>}
      </fieldset>
      <footer className={styles.dialogFooter}>{error && <p role="alert" className={styles.error}>{error}</p>}{uploading && <p role="status">Loading...</p>}<div><button type="button" disabled={uploading} onClick={close}>取消</button><button type="submit" disabled={uploading} className={styles.apply}>应用</button></div></footer>
    </form>
  </dialog>;
}
