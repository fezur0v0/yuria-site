'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import localFont from 'next/font/local'
import { FiArrowUpRight, FiCheck, FiGithub } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'
import { getLoginProtection, safeAuthDestination, startAuth } from '@/utils/auth/flow'
import Turnstile from '@/components/auth/Turnstile'
import styles from './login.module.css'

const lettering = localFont({ src: './fonts/NotoSansJP-Black.ttf', variable: '--font-poster-jp', weight: '900', display: 'swap', adjustFontFallback: false })
const handwriting = localFont({ src: './fonts/KleeOne.ttf', variable: '--font-letter-jp', weight: '600', display: 'swap', adjustFontFallback: false })
const providers = ['google', 'github'] as const

function Coordinates() {
  return <div className={styles.coordinates} aria-hidden="true">
    <div className={styles.orbit}><i /><i /><i /><span>Y</span></div>
    <span className={styles.crosshairOne}>+</span><span className={styles.crosshairTwo}>+</span>
    <span className={styles.gridPatch} />
    <div className={styles.diagram}><span>IDENTITY / SIGNAL</span><svg viewBox="0 0 160 46" fill="none"><path d="M0 35h34L50 9h40l17 26h53M0 40h37L53 14h33l17 26h57M64 0v46M130 0v46" stroke="currentColor" strokeWidth=".7" /></svg><span>35°41′ / 139°41′</span></div>
    <div className={styles.registration}><span>✳</span><span>PERSONAL ARCHIVE<br />IMAGES / WORDS / MUSIC</span></div>
    <span className={styles.verticalCode}>Y—XIN / TRANSMISSION 000.026</span>
    <span className={styles.microCode}>[ ID ]<br />0 1 0 0 1<br />1 0 1 1 0<br />0 1 0 1 1</span>
  </div>
}

export default function LoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeProvider, setActiveProvider] = useState<'github' | 'google' | null>(null)
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
        setError('Verification expired. Please verify again to continue.')
      }
    }).catch(() => { if (!cancelled) setError('Sign-in is unavailable. Please reload or try again later.') })
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
    setActiveProvider(provider)
    setError('')
    const requestedNext = new URLSearchParams(window.location.search).get('next')
    try {
      await startAuth(provider, safeAuthDestination(requestedNext), undefined, token)
    } catch {
      setError('Sign-in could not start. Please verify again and retry.')
      setToken('')
      setAttempt(value => value + 1)
      setBusy(false)
      setActiveProvider(null)
    }
  }

  return <main className={`${styles.page} ${lettering.variable} ${handwriting.variable}`} lang="en">
    {/* Preserve the widget across the reveal so expiry callbacks still close the gate. */}
    <section className={styles.gate} hidden={revealed} aria-label="Sign-in verification">
      <div className={styles.challenge}>
        {protection?.enabled && protection.siteKey && <Turnstile key={attempt} siteKey={protection.siteKey} onToken={value => { setToken(value); if (value) setError('') }} onError={setVerificationError} />}
        <p ref={gateStatus} tabIndex={-1} role="status" className={styles.gateStatus}>{verificationError || (!protection ? (error ? '' : 'Preparing verification…') : 'Please complete the human verification.')}</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {verificationError && <button type="button" onClick={() => { setToken(''); setVerificationError(''); setError(''); setAttempt(value => value + 1) }} className={styles.retry}>Verify again</button>}
        {!protection && error && <button type="button" onClick={() => window.location.reload()} className={styles.retry}>Reload</button>}
      </div>
    </section>

    {revealed && <div className={styles.poster}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="Yuria home">yuria</Link>
        <span className={styles.headerNote}>AN OPEN JOURNAL / A PRIVATE FREQUENCY</span>
        <Link href="/" className={styles.back}>HOME <FiArrowUpRight size={14} aria-hidden="true" /></Link>
      </header>
      <div className={styles.canvas}>
        <Coordinates />
        <h1 id="letter-title" className={styles.title} lang="ja"><span className={styles.salutation}>あなた</span><span className={styles.addressee}>誰なの</span></h1>
        <div className={styles.whisper} lang="ja"><span>ねえ</span><span>ねえ</span><span>ねえ</span></div>
        <p className={styles.question} lang="ja">教えてよお<span aria-hidden="true">↘</span></p>

        <section className={styles.admission} aria-labelledby="login-title" aria-busy={busy}>
          <div className={styles.admissionHeading}>
            <h2 ref={loginHeading} tabIndex={-1} id="login-title">CHOOSE YOUR ENTRANCE</h2>
            {protection?.enabled && <span className={styles.verified}><FiCheck size={10} aria-hidden="true" />VERIFIED</span>}
          </div>
          <div className={styles.tickets}>
            {providers.map((provider, index) => <div key={provider} className={`${styles.ticketWrap} ${index === 0 ? styles.googleWrap : styles.githubWrap}`}>
              <button type="button" disabled={disabled} onClick={() => handleLogin(provider)} aria-label={`Continue with ${provider === 'google' ? 'Google' : 'GitHub'}`} className={`${styles.ticket} ${activeProvider === provider ? styles.departing : ''}`}>
                <span className={styles.ticketBand} aria-hidden="true"><span>Y / XIN</span>{provider === 'google' ? <SiGoogle size={30} /> : <FiGithub size={33} />}<span>ADMIT ONE</span></span>
                <span className={styles.ticketBody}>
                  <span className={styles.ticketTop}><span>YURIA / ACCOUNT ACCESS</span><span>OPEN PASS</span></span>
                  <span className={styles.providerName}>{provider === 'google' ? 'GOOGLE' : 'GITHUB'}<FiArrowUpRight size={27} aria-hidden="true" /></span>
                  <span className={styles.ticketDetails}><span><small>ACCESS</small><strong>SIGN IN</strong></span><span><small>SECTION</small><strong>{index === 0 ? 'G—01' : 'H—02'}</strong></span><span><small>ADMISSION</small><strong>ONE / YOU</strong></span></span>
                  <span className={styles.ticketFineprint}>A LITTLE SIGNAL. A LITTLE HELLO.</span>
                </span>
                <span className={styles.stub} aria-hidden="true"><span>ENTRY / {index === 0 ? '001' : '002'}</span><span className={styles.barcode} /><strong>{index === 0 ? '0001—G' : '0002—H'}</strong><span className={styles.stubArrow}>↗</span></span>
              </button>
            </div>)}
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {busy && <p role="status" className={styles.busy}>CONNECTING TO {activeProvider?.toUpperCase()}…</p>}
          <p className={styles.admissionFoot}>TWO WAYS IN. ONE LITTLE WORLD.<span lang="ja">また、ここで。</span></p>
        </section>
      </div>
      <footer className={styles.footer}><span>YURIA.XIN / PERSONAL SPACE</span><span className={styles.footerTicks} aria-hidden="true">┼ ┼ ┼ ┼ ┼ ┼ ┼ ┼ ┼ ┼ ┼</span><span>NO SIGNAL IS EVER ORDINARY <FiArrowUpRight size={13} aria-hidden="true" /></span></footer>
    </div>}
  </main>
}
