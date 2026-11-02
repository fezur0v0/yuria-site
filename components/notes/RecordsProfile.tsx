'use client'

import { useEffect, useRef, useState } from 'react'
import { FiImage, FiUser, FiX } from 'react-icons/fi'
import { createClient } from '@/utils/content/client'
import { uploadPrivateImage } from '@/utils/content/privateUpload'
import { theaterMediaUrl } from '@/utils/notes/media'
import { emptyRecordProfile, parseRecordProfile, recordProfileKey, type RecordProfile } from '@/utils/notes/record-profile'
import PrivateTheaterImage from './PrivateTheaterImage'
import MeImageCropper, { type MeCropHandle } from '@/components/admin/MeImageCropper'
import styles from './records-social.module.css'

type Character = { id: string; name: string; avatar: string | null }
type Target = { scope: 'self' | 'pair'; field: 'name' | 'bio' | 'avatar' | 'cover' | 'photo'; index?: number; label: string }
export default function RecordsProfile({ character }: { character?: Character }) {
  const [self, setSelf] = useState({ ...emptyRecordProfile })
  const [pair, setPair] = useState({ ...emptyRecordProfile })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<Target | null>(null)
  useEffect(() => {
    let cancelled = false
    setReady(false); setError(''); setTarget(null); setPair({ ...emptyRecordProfile })
    async function load() {
      try {
        const client = createClient()
        const keys = [recordProfileKey(), ...(character ? [recordProfileKey(character.id)] : [])]
        const results = await Promise.all(keys.map(key => client.from('site_config').select('value').eq('key', key).limit(1)))
        if (results.some(result => result.error)) throw new Error('个人介绍读取失败，请刷新重试')
        const values = results.map(result => parseRecordProfile(result.data?.[0]?.value))
        if (!cancelled) { setSelf(values[0]); setPair(values[1] ?? { ...emptyRecordProfile }); setReady(true) }
      } catch { if (!cancelled) setError('个人介绍读取失败，请刷新重试') }
    }
    void load()
    return () => { cancelled = true }
  }, [character?.id])
  const current = character ? pair : self
  function edit(scope: Target['scope'], field: Target['field'], label: string) { if (ready) setTarget({ scope, field, label }) }
  function avatar(value: string, label: string, scope: Target['scope']) {
    return <button type="button" className={styles.avatar} aria-label={`编辑${label}头像`} disabled={!ready} onClick={() => edit(scope, 'avatar', `${label}头像`)}>{value ? <PrivateTheaterImage src={value} alt={`${label}头像`} /> : <FiUser size={29} aria-hidden="true" />}</button>
  }
  return <div className={styles.profileStack}><section className={styles.identity} aria-label={character ? '角色与我的介绍' : 'Echo 页个人介绍'}>
    <button type="button" className={styles.cover} aria-label="编辑 Echo 页背景" disabled={!ready} onClick={() => edit(character ? 'pair' : 'self', 'cover', '背景')}>{current.cover && <PrivateTheaterImage src={current.cover} alt="" />}<FiImage size={18} aria-hidden="true" /></button>
    <div className={`${styles.identityBody} ${character ? styles.pair : ''}`}>
      <div className={styles.avatars}>{avatar(self.avatar, '我的', 'self')}{character && avatar(pair.avatar || character.avatar || '', '角色', 'pair')}</div>
      <div className={styles.names}><button disabled={!ready} onClick={() => edit('self', 'name', '我的名字')}>{self.name || 'yuria'}</button>{character && <><span>&amp;</span><button disabled={!ready} onClick={() => edit('pair', 'name', '角色称呼')}>{pair.name || character.name}</button></>}</div>
      <button className={styles.signature} disabled={!ready} onClick={() => edit(character ? 'pair' : 'self', 'bio', character ? '个性签名' : '个人介绍')}>{current.bio || (ready ? character ? '写一句属于你们的个签' : '写一点关于自己' : 'Loading...')}</button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
    </section>
    <section className={styles.collagePanel} aria-label="私密照片墙"><h2>Moments</h2><div className={styles.collage} role="group" aria-label="私密照片墙">{[0, 1, 2].map(index => <button type="button" key={index} aria-label={`编辑照片 ${index + 1}`} disabled={!ready} onClick={() => setTarget({ scope: character ? 'pair' : 'self', field: 'photo', index, label: `照片 ${index + 1}` })}>{current.photos?.[index] ? <PrivateTheaterImage src={current.photos[index]} alt={`照片 ${index + 1}`} /> : <FiImage size={20} aria-hidden="true" />}</button>)}</div></section>
    {target && <ProfileEdit key={`${character?.id ?? 'self'}:${target.scope}:${target.field}:${target.index ?? 0}`} target={target} initial={target.field === 'photo' ? (current.photos?.[target.index ?? 0] ?? '') : (target.scope === 'self' ? self : pair)[target.field]} onClose={() => setTarget(null)} onSave={async value => {
      const previous = target.scope === 'self' ? self : pair
      const photos: [string, string, string] = [...(previous.photos ?? ['', '', ''])]
      if (target.field === 'photo') photos[target.index ?? 0] = value
      const next = parseRecordProfile(target.field === 'photo' ? { ...previous, photos } : { ...previous, [target.field]: value })
      const key = recordProfileKey(target.scope === 'pair' ? character?.id : undefined)
      const result = await createClient().from('site_config').upsert({ key, value: JSON.stringify(next) }, { onConflict: 'key' })
      if (result.error) throw new Error('保存未完成，请稍后重试')
      if (target.scope === 'self') setSelf(next); else setPair(next)
      setTarget(null)
    }} />}
  </div>
}
function ProfileEdit({ target, initial, onClose, onSave }: { target: Target; initial: string; onClose: () => void; onSave: (value: string) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cropper = useRef<MeCropHandle>(null)
  const [value, setValue] = useState(initial)
  const [source, setSource] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const image = target.field === 'avatar' || target.field === 'cover' || target.field === 'photo'
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.current?.showModal(); return () => { document.body.style.overflow = overflow } }, [])
  useEffect(() => () => { if (source) URL.revokeObjectURL(source) }, [source])
  async function save() {
    if (busy) return
    setBusy(true); setError('')
    try {
      let next = value
      if (source) {
        if (!cropper.current || !ready) throw new Error('请等待图片加载')
        const file = await cropper.current.exportFile()
        const path = `records-profile/${crypto.randomUUID()}.${file.type === 'image/webp' ? 'webp' : 'png'}`
        const result = await uploadPrivateImage(path, file)
        if (result.error) throw result.error
        next = theaterMediaUrl(path)
      }
      await onSave(next)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存未完成') }
    finally { setBusy(false) }
  }
  return <dialog ref={dialog} className={styles.editDialog} aria-label={`编辑「${target.label}」`} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}><form onSubmit={event => { event.preventDefault(); void save() }}>
    <header><h2>编辑「{target.label}」</h2><button type="button" aria-label="关闭编辑" disabled={busy} onClick={onClose}><FiX size={20} /></button></header>
    <div className={styles.editBody} inert={busy}>{image ? <>{source ? <MeImageCropper key={source} ref={cropper} source={source} round={target.field === 'avatar'} defaultRatio={target.field === 'avatar' ? '1' : target.field === 'photo' ? String(target.index === 2 ? 4 / 3 : 3 / 4) : String(16 / 9)} onReady={setReady} /> : value ? <PrivateTheaterImage className={styles.editPreview} src={value} alt="预览" /> : <div className={styles.blankPreview}><FiImage size={30} /></div>}<label className={styles.upload}>选择图片<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (!['image/png','image/jpeg','image/webp','image/avif'].includes(file.type) || file.size > 20 * 1024 * 1024) { setError('请选择 20 MB 以内的图片'); return } setReady(false); setSource(URL.createObjectURL(file)); event.target.value = '' }} /></label><button type="button" onClick={() => { setSource(null); setValue('') }}>清空图片</button></> : <textarea aria-label={target.label} autoFocus rows={target.field === 'name' ? 2 : 5} maxLength={target.field === 'name' ? 60 : 600} value={value} onChange={event => setValue(event.target.value)} />}</div>
    <footer>{error && <p role="alert" className={styles.error}>{error}</p>}<div><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" disabled={busy || Boolean(source && !ready)}>{busy ? 'Loading...' : '保存'}</button></div></footer>
  </form></dialog>
}
