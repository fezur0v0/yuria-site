'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import localFont from 'next/font/local'
import { FiArrowLeft, FiArrowUpRight, FiCheck, FiGithub } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'
import { getLoginProtection, safeAuthDestination, startAuth } from '@/utils/auth/flow'
import Turnstile from '@/components/auth/Turnstile'
import { siteAsset } from '@/utils/siteAssets'
import styles from './login.module.css'

const handwriting = localFont({ src: './fonts/KleeOne.ttf', variable: '--font-letter-jp', weight: '600', display: 'swap', adjustFontFallback: false })

export default function LoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [protection, setProtection] = useState<{ enabled: boolean; siteKey?: string } | null>(null)
  const [token, setToken] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const loginHeading = useRef<HTMLHeadingElement>(null)
  const gateStatus = useRef<HTMLParagraphElement>(null)
  const revealed = protection !== null && (!protection.enabled || Boolean(token))
  const wasRevealed = useRef(false)

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

  useEffect(() => {
    if (revealed) loginHeading.current?.focus({ preventScroll: true })
    else if (wasRevealed.current) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      gateStatus.current?.focus({ preventScroll: true })
    }
    wasRevealed.current = revealed
  }, [revealed])

  const disabled = busy || !revealed

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
    <main className={`${styles.page} ${handwriting.variable}`} lang="zh-CN">
      {/* Keep the same widget mounted after the reveal so expiry can close the gate. */}
      <section className={styles.gate} hidden={revealed} aria-label="登录前验证">
        <div className={styles.challenge}>
          {protection?.enabled && protection.siteKey && <Turnstile key={attempt} siteKey={protection.siteKey} onToken={value => { setToken(value); if (value) setError('') }} onError={setVerificationError} />}
          <p ref={gateStatus} tabIndex={-1} role="status" className={styles.gateStatus}>
            {verificationError || (!protection ? (error ? '' : '正在准备验证…') : '请先完成真人验证。')}
          </p>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {verificationError && <button type="button" onClick={() => { setToken(''); setVerificationError(''); setError(''); setAttempt(value => value + 1) }} className={styles.retry}>重新验证</button>}
          {!protection && error && <button type="button" onClick={() => window.location.reload()} className={styles.retry}>重新加载</button>}
        </div>
      </section>

      {revealed && <div className={styles.spread}>
        <section className={styles.poster} aria-labelledby="letter-title" lang="ja">
          <header className={styles.posterHeader}>
            <Link href="/" className={styles.wordmark} aria-label="Yuria 首页">yuria</Link>
            <span>PERSONAL ARCHIVE</span>
          </header>
          <div className={styles.artboard}>
            <span className={styles.outline} aria-hidden="true">YURIA</span>
            <h1 id="letter-title" className={styles.title}>
              <span className={styles.salutation}>あなた</span>
              <span className={styles.addressee}>誰なの</span>
            </h1>
            <div className={styles.echo}><span>ねえ</span><span>ねえ</span><span>ねえ</span></div>
            <figure className={styles.print}>
              {/* This existing R2 image shares the site's monochrome visual archive. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={siteAsset('/images/legacy-media/cover-1785504732354.jpg')} alt="" width={736} height={414} />
              <figcaption><span>YURIA / VISUAL NOTES</span><FiArrowUpRight size={15} aria-hidden="true" /></figcaption>
            </figure>
            <p className={styles.question}>教えてよお<span aria-hidden="true">↗</span></p>
            <span className={styles.sideNote} aria-hidden="true">IMAGES / WORDS / MUSIC</span>
          </div>
          <footer className={styles.posterFooter}><span>AN OPEN JOURNAL</span><span>YURIA.XIN</span></footer>
        </section>

        <section className={styles.signin} aria-labelledby="login-title" aria-busy={busy}>
          <div className={styles.signinTop}>
            <span>01 / SIGN IN</span>
            <Link href="/" className={styles.back}><FiArrowLeft size={13} aria-hidden="true" />返回首页</Link>
          </div>
          <div className={styles.loginContents}>
            <div className={styles.intro}>
              <span className={styles.eyebrow}>A LITTLE HELLO</span>
              <h2 ref={loginHeading} tabIndex={-1} id="login-title">欢迎回来。</h2>
              <p>使用你熟悉的账号，登录 Yuria。</p>
            </div>
            {protection?.enabled && <p className={styles.verified}><FiCheck size={12} aria-hidden="true" />真人验证已通过</p>}
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.methods}>
              <button type="button" disabled={disabled} onClick={() => handleLogin('google')} className={styles.loginButton}>
                <SiGoogle size={18} aria-hidden="true" /><span>使用 Google 登录</span><FiArrowUpRight size={19} aria-hidden="true" />
              </button>
              <button type="button" disabled={disabled} onClick={() => handleLogin('github')} className={styles.loginButton}>
                <FiGithub size={20} aria-hidden="true" /><span>使用 GitHub 登录</span><FiArrowUpRight size={19} aria-hidden="true" />
              </button>
            </div>
            {busy && <p role="status" className={styles.busy}>正在带你进去…</p>}
            <div className={styles.signoff}><span lang="ja">また、ここで。</span><FiArrowUpRight size={23} aria-hidden="true" /></div>
          </div>
          <footer className={styles.signinFooter}><span>YURIA — ACCOUNT ACCESS</span><span lang="ja">今日も、いい一曲を。</span></footer>
        </section>
      </div>}
    </main>
  )
}
