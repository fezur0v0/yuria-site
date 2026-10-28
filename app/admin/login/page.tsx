'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import localFont from 'next/font/local'
import { FiArrowLeft, FiArrowUpRight, FiGithub } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'
import { getLoginProtection, safeAuthDestination, startAuth } from '@/utils/auth/flow'
import Turnstile from '@/components/auth/Turnstile'
import { siteAsset } from '@/utils/siteAssets'
import styles from './login.module.css'

const handwriting = localFont({ src: './fonts/KleeOne.ttf', variable: '--font-letter-jp', weight: '600', display: 'swap', adjustFontFallback: false })
const signature = localFont({ src: './fonts/Caveat.ttf', variable: '--font-letter-en', display: 'swap', adjustFontFallback: false })

export default function LoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [protection, setProtection] = useState<{ enabled: boolean; siteKey?: string } | null>(null)
  const [token, setToken] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getLoginProtection().then(config => {
      if (cancelled) return
      setProtection(config)
      if (new URLSearchParams(window.location.search).get('error') === 'verification') {
        setError('验证已过期或未完成，请重新验证后登录。')
      }
    })
      .catch(() => { if (!cancelled) setError('登录服务暂时不可用，请重新加载或稍后重试。') })
    return () => { cancelled = true }
  }, [])

  const disabled = busy || !protection || (protection.enabled && !token)

  const handleLogin = async (provider: 'github' | 'google') => {
    if (disabled) return
    setBusy(true)
    setError('')
    const requestedNext = new URLSearchParams(window.location.search).get('next')
    try {
      await startAuth(provider, safeAuthDestination(requestedNext), undefined, token)
    } catch (error) {
      setError(error instanceof Error ? error.message : '暂时无法连接登录服务，请稍后再试。')
      setToken('')
      setAttempt(value => value + 1)
      setBusy(false)
    }
  }

  return (
    <main className={`${styles.page} ${handwriting.variable} ${signature.variable}`} lang="zh-CN"
      style={{ '--letter-paper': `url("${siteAsset('/textures/paper-white.jpg')}")` } as React.CSSProperties}>
      <div className={styles.paper}>
        <header className={styles.header}>
          <Link href="/" className={styles.wordmark} aria-label="Yuria 首页">yuria<span aria-hidden="true">.</span></Link>
          <span className={styles.headerNote}>PRIVATE CORRESPONDENCE</span>
          <Link href="/" className={styles.back}><FiArrowLeft size={13} aria-hidden="true" />返回首页</Link>
        </header>

        <div className={styles.composition}>
          <section className={styles.letter} aria-labelledby="letter-title" lang="ja">
            <span className={styles.letterIndex}>A LETTER / FOR YOU</span>
            <h1 id="letter-title" className={styles.title}>
              <span className={styles.salutation}><span className={styles.inkFrame}>あなた</span></span>
              <span className={styles.addressee}><span className={styles.inkFrame}>誰なの</span></span>
            </h1>
            <div className={styles.message}>
              <p className={styles.echo}><span>ねえ</span><span>ねえ</span><span>ねえ</span></p>
              <p className={styles.question}>教えてよお</p>
            </div>
            <svg className={styles.letterStroke} viewBox="0 0 220 55" fill="none" aria-hidden="true">
              <path d="M4 22C43 39 130 44 193 18M181 10l17 6-9 16M12 29c28 11 53 13 81 12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </section>

          <section className={styles.receipt} aria-labelledby="login-title" aria-busy={busy}>
            <div className={styles.receiptTop}>
              <span>YURIA / SIGN IN</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth=".8" /></svg>
            </div>
            <div className={styles.receiptIntro}>
              <span className={styles.receiptEnglish} lang="en">A little hello.</span>
              <h2 id="login-title">请在这里签收。</h2>
              <p>使用你熟悉的账号，登录 Yuria。</p>
            </div>
            <div className={styles.receiptContents}>
              {protection?.enabled && protection.siteKey && <div className={styles.verification}>
                <Turnstile key={attempt} siteKey={protection.siteKey} onToken={setToken} onError={setVerificationError} />
                <p role="status" className={styles.verificationStatus}>{verificationError || (token ? '验证通过，可以继续登录。' : '请先完成真人验证。')}</p>
                {verificationError && <button type="button" onClick={() => { setToken(''); setVerificationError(''); setAttempt(value => value + 1) }} className={styles.retry}>重新验证</button>}
              </div>}
              {!protection && !error && <p role="status" className={styles.loading}>正在准备登录…</p>}
              {error && <p role="alert" className={styles.error}>{error}</p>}
              <div className={styles.methods}>
                <button type="button" disabled={disabled} onClick={() => handleLogin('github')} className={styles.loginButton}>
                  <FiGithub size={18} aria-hidden="true" /><span>使用 GitHub 登录</span><FiArrowUpRight size={16} aria-hidden="true" />
                </button>
                <button type="button" disabled={disabled} onClick={() => handleLogin('google')} className={styles.loginButton}>
                  <SiGoogle size={16} aria-hidden="true" /><span>使用 Google 登录</span><FiArrowUpRight size={16} aria-hidden="true" />
                </button>
              </div>
              {busy && <p role="status" className={styles.busy}>正在带你进去…</p>}
              {!protection && error && <button type="button" onClick={() => window.location.reload()} className={styles.retry}>重新加载</button>}
            </div>
            <div className={styles.receiptBottom} aria-hidden="true"><span>PLEASE KEEP THIS LITTLE HELLO</span><span className={styles.postmark}>Y</span></div>
          </section>

          <div className={styles.stamp} aria-hidden="true"><span>LETTERS FROM</span><strong>Y</strong><span>YURIA · WITH CARE</span></div>
          <div className={styles.signoff}><span lang="ja">また、ここで。</span><p lang="en">Yours, <i>Yuria</i></p></div>
        </div>

        <footer className={styles.footer}><span>KEEP A LITTLE ROOM FOR THE UNEXPECTED.</span><span lang="ja">今日も、いい一曲を。</span></footer>
      </div>
    </main>
  )
}
