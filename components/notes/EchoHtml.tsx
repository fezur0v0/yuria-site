'use client'

import { useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiCode, FiEdit2, FiRefreshCw } from 'react-icons/fi'
import { createClient } from '@/utils/content/client'
import { echoHtmlDocument, echoHtmlKey, MAX_ECHO_HTML, parseEchoHtml } from '@/utils/notes/echo-html'
import styles from './echo-html.module.css'

export default function EchoHtml({ id, onClose }: { id: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState('')
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState('')
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<'code' | 'preview'>('code')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [reload, setReload] = useState(0)
  const draftKey = `yuria:${echoHtmlKey(id)}:draft`
  useEffect(() => {
    dialog.current?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])
  useEffect(() => {
    let cancelled = false
    setReady(false); setError('')
    async function load() {
      try {
        const result = await createClient().from('site_config').select('value').eq('key', echoHtmlKey(id)).limit(1)
        if (result.error) throw new Error('HTML 读取失败，请重试')
        const html = parseEchoHtml(result.data?.[0]?.value)
        let draft: string | null = null
        try { draft = sessionStorage.getItem(draftKey) } catch {}
        if (cancelled) return
        const next = draft !== null && draft.length <= MAX_ECHO_HTML ? draft : html
        setSaved(html); setCode(next); setPreview(next); setEditing(!html.trim() || next !== html); setReady(true)
      } catch (failure) { if (!cancelled) setError(failure instanceof Error ? failure.message : 'HTML 读取失败，请重试') }
    }
    void load()
    return () => { cancelled = true }
  }, [id, draftKey, attempt])
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => setPreview(code), 350)
    return () => clearTimeout(timer)
  }, [code, ready])
  function change(value: string) {
    setCode(value); setError('')
    try { if (value === saved) sessionStorage.removeItem(draftKey); else sessionStorage.setItem(draftKey, value) } catch {}
  }
  async function save() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const html = parseEchoHtml({ html: code })
      const result = await createClient().from('site_config').upsert({ key: echoHtmlKey(id), value: JSON.stringify({ html }) }, { onConflict: 'key' })
      if (result.error) throw new Error('HTML 未保存，请重试')
      setSaved(html); setPreview(html); setEditing(false)
      try { sessionStorage.removeItem(draftKey) } catch {}
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'HTML 未保存，请重试') }
    finally { setBusy(false) }
  }
  function cancel() {
    setCode(saved); setPreview(saved); setEditing(false); setError('')
    try { sessionStorage.removeItem(draftKey) } catch {}
  }
  return <dialog ref={dialog} className={styles.dialog} aria-label="Echo HTML" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className={styles.header}>
      <button type="button" aria-label="返回 Echo" disabled={busy} onClick={onClose}><FiArrowLeft size={20} /></button>
      <h2><FiCode size={18} />HTML</h2>
      <div className={styles.actions}>{ready && (editing ? <><button type="button" disabled={busy} onClick={cancel}>Cancel</button><button type="button" className={styles.save} disabled={busy} onClick={() => void save()}>{busy ? 'Saving...' : 'Save'}</button></> : <button type="button" onClick={() => { setEditing(true); setTab('code') }}><FiEdit2 size={16} />Edit</button>)}</div>
    </header>
    {error && <div className={styles.error} role="alert">{error}{!ready && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button>}</div>}
    {!ready ? (!error && <p className={styles.loading}>Loading...</p>) : <>
      {editing && <div className={styles.tabs} role="tablist" aria-label="HTML 编辑视图"><button type="button" role="tab" aria-selected={tab === 'code'} aria-controls="echo-html-code" onClick={() => setTab('code')}>Code</button><button type="button" role="tab" aria-selected={tab === 'preview'} aria-controls="echo-html-preview" onClick={() => setTab('preview')}>Preview</button></div>}
      <div className={`${styles.workspace} ${editing ? styles.editing : ''}`} data-tab={tab}>
        {editing && <section className={styles.code} id="echo-html-code" aria-label="HTML 代码区"><div className={styles.panelTitle}>Code<span>HTML · CSS · JavaScript</span></div><textarea aria-label="HTML 代码" value={code} maxLength={MAX_ECHO_HTML} disabled={busy} spellCheck={false} placeholder={'<style>\n  /* Your style */\n</style>\n\n<button onclick="this.textContent=\'Hi!\'">Click me</button>'} onChange={event => change(event.target.value)} onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); const field = event.currentTarget; const start = field.selectionStart; change(code.slice(0,start) + '  ' + code.slice(field.selectionEnd)); requestAnimationFrame(() => { field.selectionStart = field.selectionEnd = start + 2 }) } }} /></section>}
        <section className={styles.preview} id="echo-html-preview" aria-label="HTML 展示区"><div className={styles.panelTitle}>Preview<button type="button" aria-label="重新运行 HTML" onClick={() => setReload(value => value + 1)}><FiRefreshCw size={15} /></button></div><iframe key={reload} title="HTML Preview" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={echoHtmlDocument(editing ? preview : saved)} /></section>
      </div>
    </>}
  </dialog>
}
