'use client'

import { useEffect, useRef } from 'react'
import styles from './notes-access-notice.module.css'

export default function NotesAccessNotice({ onReturn, onSwitchAccount }: { onReturn: () => void; onSwitchAccount: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    dialog.current?.focus({ preventScroll: true })
    return () => { document.body.style.overflow = previous }
  }, [])

  return <dialog ref={dialog} tabIndex={-1} className={styles.notice} aria-labelledby="airp-access-title" aria-describedby="airp-access-description" onCancel={event => { event.preventDefault(); onReturn() }}>
    <img className={styles.mark} src="/icon.png" alt="yuria" width={56} height={56} />
    <p className={styles.eyebrow}>AIRP</p>
    <h1 id="airp-access-title">Your account has<br />been disabled.</h1>
    <div id="airp-access-description" className={styles.description}>
      <p>After an automatic review of your identity, access to this private space has been disabled.</p>
      <p className={styles.reason}>Reason: you are not yuria.</p>
      <p>这里的故事，暂时只向它的主人开放。</p>
    </div>
    <div className={styles.actions}><button type="button" onClick={onReturn}>Go back</button><button type="button" onClick={onSwitchAccount}>Switch account</button></div>
    <p className={styles.footnote}>仅限制 AIRP 访问 · 不影响你的站内账号</p>
  </dialog>
}
