'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FiCrop, FiImage, FiPlus, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import { uploadPublicMedia } from '@/utils/r2/client';
import { siteAsset } from '@/utils/siteAssets';
import { addMeTag, defaultMeImageFrame, meFrameStyle, mePhotoSlots, parseMeContent, type MeContent, type MeImageFrame } from '@/components/me/content';
import type { DialoguePosition, MeEditTarget } from '@/components/me/editing';
import styles from './me-settings.module.css';
import MeImageCropper, { type MeCropHandle } from './MeImageCropper';
import MeTagsEditor from './MeTagsEditor';

const textLabels: Record<keyof MeContent['profile'], string> = { name: '名字', alias: '称呼', quote: '个性签名', bio: '装饰', tags: '标签', note: '祂说', noteReply: '祂说', favorites: 'Likes', about: 'About me' };
const limits: Record<keyof MeContent['profile'], number> = { name: 60, alias: 60, quote: 403, bio: 200, tags: 200, note: 600, noteReply: 100, favorites: 1500, about: 1500 };

function ImageField({ value, label, frame, shape, disabled, onCrop, onChange, onUpload }: { value: string; label: string; frame?: MeImageFrame; shape: 'circle' | 'square' | 'portrait' | 'background'; disabled: boolean; onCrop: () => void; onChange: (value: string) => void; onUpload: (file: File) => void }) {
  const safe = /^https:\/\//i.test(value) || /^\/(?!\/)/.test(value);
  return <div>
    <div className={styles.imagePreview} data-shape={shape}>{safe ? <img src={siteAsset(value)} alt={`${label}预览`} style={{ ...meFrameStyle(frame), objectFit: shape === 'portrait' ? 'contain' : 'cover' }} /> : <FiImage size={30} aria-hidden="true" />}</div>
    <div className={styles.imageActions}><label className={styles.upload}><FiUpload size={16} aria-hidden="true" /><span>上传图片</span><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={disabled} aria-label={`上传${label}`} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ''; }} /></label><button type="button" disabled={disabled || !safe} onClick={onCrop}><FiCrop size={16} aria-hidden="true" />{shape === 'circle' ? '圈选头像' : '裁剪图片'}</button></div>
    <input aria-label="图片地址" className={styles.textField} value={value} inputMode="url" placeholder="也可以粘贴图片地址" onChange={event => onChange(event.target.value)} />
  </div>;
}

export default function MeEditDialog({ content, target, onClose, onApply }: {
  content: MeContent; target: MeEditTarget; onClose: () => void; onApply: (content: MeContent, dialogue?: DialoguePosition) => void;
}) {
  const [pending, setPending] = useState<MeContent>(() => structuredClone(content));
  const [textValue, setTextValue] = useState(() => { if (target.kind !== 'text' || target.field === 'tags') return ''; const value = content.profile[target.field]; return Array.isArray(value) ? value.join('\n') : value; });
  const [selectedMoment, setSelectedMoment] = useState(target.kind === 'album' ? target.index ?? 0 : 0);
  const [topicId, setTopicId] = useState<string | undefined>(target.kind === 'dialogue' ? target.topicId : undefined);
  const [pageIndex, setPageIndex] = useState(target.kind === 'dialogue' ? target.pageIndex : 0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropReady, setCropReady] = useState(false);
  const cropper = useRef<MeCropHandle>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const photos = mePhotoSlots(pending);
  const topic = pending.topics.find(item => item.id === topicId);
  const page = Math.min(pageIndex, topic ? topic.pages.length - 1 : 0);
  const label = target.kind === 'text' ? textLabels[target.field] : target.kind === 'image' ? target.field === 'avatarUrl' ? '头像' : target.field === 'portraitUrl' ? '立绘' : target.field === 'coverUrl' ? '封面' : '背景' : target.kind === 'album' ? '相册' : '对白';
  const roundCrop = target.kind === 'image' && target.field === 'avatarUrl';
  const title = `${cropSource ? roundCrop ? '圈选' : '裁剪' : '编辑'}「${label}」`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    if (target.kind === 'text' || target.kind === 'dialogue') dialog.current?.querySelector<HTMLElement>('textarea, input:not([type="file"]), select')?.focus({ preventScroll: true });
    else dialog.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => () => { if (cropSource?.startsWith('blob:')) URL.revokeObjectURL(cropSource); }, [cropSource]);

  function updateImage(value: string) {
    if (target.kind === 'image') setPending(previous => ({ ...previous, [target.field]: value, frames: { ...previous.frames, [target.field]: { ...defaultMeImageFrame } } }));
    else setPending(previous => ({ ...previous, moments: mePhotoSlots(previous).map((url, i) => ({ kind: 'image', value: i === selectedMoment ? value : url })), frames: { ...previous.frames, photos: Array.from({ length: 3 }, (_, i) => i === selectedMoment ? { ...defaultMeImageFrame } : previous.frames?.photos?.[i] ?? { ...defaultMeImageFrame }) } }));
  }
  function selectFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 20 * 1024 * 1024) { setError('请选择 20 MB 以内的 JPG、PNG、WebP 或 AVIF 图片。'); return; }
    setError(''); setCropReady(false); setCropSource(URL.createObjectURL(file));
  }
  async function beginCrop(value: string) {
    const source = siteAsset(value);
    if (!source) return;
    setUploading(true); setError(''); setCropReady(false);
    try {
      if (source.startsWith('/') && !source.startsWith('//')) setCropSource(source);
      else {
        const response = await fetch(`/api/admin/me-crop-source?url=${encodeURIComponent(source)}`, { signal: AbortSignal.timeout(15000) });
        if (response.ok) setCropSource(URL.createObjectURL(await response.blob()));
        else if (response.status === 400) setCropSource(source);
        else throw new Error('图片读取未完成，请上传原图后重试');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '图片读取未完成，请重试'); }
    finally { setUploading(false); }
  }
  async function completeCrop() {
    if (!cropper.current || !cropReady) return;
    setUploading(true); setError('');
    try {
      const file = await cropper.current.exportFile();
      updateImage(await uploadPublicMedia(file, 'portfolio/content'));
      setCropSource(null); setCropReady(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '裁剪未完成，请重试'); }
    finally { setUploading(false); }
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cropSource) return;
    try {
      const next = structuredClone(pending);
      if (target.kind === 'text') {
        const field = target.field;
        if (field === 'quote') next.profile.quote = textValue ? textValue.split('\n') : [];
        else if (field === 'tags') next.profile.tags = addMeTag(next.profile.tags, textValue);
        else next.profile[field] = textValue;
      }
      const validated = parseMeContent(next);
      dialog.current?.close();
      onApply(validated, target.kind === 'dialogue' ? { topicId: topic?.id, pageIndex: page } : undefined);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '请检查填写内容'); }
  }
  function close() { if (!uploading) dialog.current?.close(); }

  return <dialog ref={dialog} className={styles.dialog} tabIndex={-1} aria-labelledby="me-edit-title" onClose={onClose} onCancel={event => { if (uploading) event.preventDefault(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <form onSubmit={apply}>
      <header className={styles.dialogHeader}><h2 id="me-edit-title">{title}</h2><button type="button" aria-label="关闭编辑" disabled={uploading} onClick={close}><FiX size={20} /></button></header>
      <div inert={uploading} aria-busy={uploading} className={styles.dialogBody}>
        {cropSource ? <MeImageCropper key={cropSource} ref={cropper} source={cropSource} round={roundCrop} defaultRatio={target.kind === 'image' && target.field === 'portraitUrl' ? 'original' : target.kind === 'image' && (target.field === 'backgroundUrl' || target.field === 'coverUrl') ? String(16 / 9) : '1'} onReady={setCropReady} /> : <>
        {target.kind === 'text' && (target.field === 'tags' ? <MeTagsEditor tags={pending.profile.tags} input={textValue} onInput={setTextValue} onChange={tags => setPending(previous => ({ ...previous, profile: { ...previous.profile, tags } }))} onError={setError} /> : <textarea aria-label={textLabels[target.field]} className={styles.textField} autoFocus rows={target.field === 'name' || target.field === 'alias' ? 2 : 5} maxLength={limits[target.field]} value={textValue} onChange={event => setTextValue(event.target.value)} />)}
        {target.kind === 'image' && <><ImageField label={label} value={pending[target.field] ?? ''} frame={pending.frames?.[target.field]} shape={target.field === 'avatarUrl' ? 'circle' : target.field === 'portraitUrl' ? 'portrait' : 'background'} onCrop={() => { void beginCrop(pending[target.field] ?? ''); }} disabled={uploading} onChange={updateImage} onUpload={selectFile} />{(target.field === 'backgroundUrl' || target.field === 'coverUrl') ? <button type="button" onClick={() => updateImage('')}>移除{label}</button> : target.field === 'portraitUrl' && <p className={styles.help}>透明背景 PNG 或 WebP 更适合立绘。</p>}</>}
        {target.kind === 'album' && <>
          <div className={styles.albumItems}>{photos.map((url, i) => <button type="button" key={i} aria-label={`选择相册第 ${i + 1} 项`} aria-pressed={selectedMoment === i} onClick={() => setSelectedMoment(i)}>{url ? <img src={siteAsset(url)} alt="" style={meFrameStyle(pending.frames?.photos?.[i])} /> : <FiPlus size={22} aria-hidden="true" />}</button>)}</div>
          <div className={styles.row}><span>第 {selectedMoment + 1} 项</span><button type="button" disabled={!photos[selectedMoment]} onClick={() => updateImage('')}><FiTrash2 size={15} />移除</button></div>
          <ImageField label="相册图片" value={photos[selectedMoment]} frame={pending.frames?.photos?.[selectedMoment]} shape="square" onCrop={() => { void beginCrop(photos[selectedMoment]); }} disabled={uploading} onChange={updateImage} onUpload={selectFile} />
        </>}
        {target.kind === 'dialogue' && <>
          <label>choose<select value={topic ? `topic:${topic.id}` : 'greeting'} onChange={event => { setTopicId(event.target.value === 'greeting' ? undefined : event.target.value.slice(6)); setPageIndex(0); }}><option value="greeting">开场对白</option>{pending.topics.map(item => <option key={item.id} value={`topic:${item.id}`}>{item.label}</option>)}</select></label>
          {topic && <><input aria-label="选项文字" className={styles.textField} value={topic.label} maxLength={80} onChange={event => setPending(previous => ({ ...previous, topics: previous.topics.map(item => item.id === topic.id ? { ...item, label: event.target.value } : item) }))} /><label>对白页码<select value={page} onChange={event => setPageIndex(Number(event.target.value))}>{topic.pages.map((_, i) => <option value={i} key={i}>第 {i + 1} 页</option>)}</select></label></>}
          <textarea aria-label={topic ? `第 ${page + 1} 页对白` : '开场对白'} className={styles.textField} rows={6} maxLength={topic ? 404 : 904} value={(topic ? topic.pages[page] : pending.greeting).join('\n')} onChange={event => { const lines = event.target.value.split('\n'); setPending(previous => topic ? { ...previous, topics: previous.topics.map(item => item.id === topic.id ? { ...item, pages: item.pages.map((value, i) => i === page ? lines : value) } : item) } : { ...previous, greeting: lines }); }} />
        </>}
      </>}
      </div>
      <footer className={styles.dialogFooter}>{error && <p role="alert" className={styles.error}>{error}</p>}{uploading && <p role="status">Loading...</p>}<div><button type="button" disabled={uploading} onClick={cropSource ? () => { setCropSource(null); setCropReady(false); setError(''); } : close}>{cropSource ? '返回' : '取消'}</button>{cropSource ? <button type="button" disabled={uploading || !cropReady} className={styles.apply} onClick={() => { void completeCrop(); }}>完成裁剪</button> : <button type="submit" disabled={uploading} className={styles.apply}>应用</button>}</div></footer>
    </form>
  </dialog>;
}
