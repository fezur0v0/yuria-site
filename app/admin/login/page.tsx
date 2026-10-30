'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import localFont from 'next/font/local'
import { FiGithub, FiPlus } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'
import { getLoginProtection, safeAuthDestination, startAuth } from '@/utils/auth/flow'
import Turnstile from '@/components/auth/Turnstile'
import styles from './login.module.css'

const lettering = localFont({ src: './fonts/NotoSansJP-Black.ttf', variable: '--font-poster-jp', weight: '900', display: 'swap', adjustFontFallback: false })
const handwriting = localFont({ src: './fonts/KleeOne.ttf', variable: '--font-letter-jp', weight: '600', display: 'swap', adjustFontFallback: false })
const providers = ['google', 'github'] as const

function IndustrialMarks() {
  return <div className={styles.industrial} aria-hidden="true">
    <div className={styles.dotField} />
    <svg className={styles.matrixMark} viewBox="0 0 164 100" fill="none">
      <path d="M4 16h156M4 23h119M122 25v50h36M145 56h12M145 65h12M145 74h12" stroke="currentColor" strokeWidth=".7" />
      <path d="M4 12h63v4H4zM76 12h5v4h-5zM87 12h2v4h-2zM111 42h10v10h-10zM101 52h10v10h-10zM121 52h10v10h-10zM111 62h10v10h-10z" fill="currentColor" />
      <path d="M101 42h10v10h-10zM121 42h10v10h-10zM111 52h10v10h-10zM121 62h10v10h-10zM32 42v7m-4-3h8M54 67v7m-4-3h8" stroke="currentColor" strokeWidth=".7" />
      <text x="5" y="42" fill="currentColor" fontSize="8" fontFamily="monospace">A3—D</text><text x="5" y="86" fill="currentColor" fontSize="4" fontFamily="monospace">AR / 17—20.0610</text>
    </svg>
    <div className={styles.indexRail}><strong>Aster.</strong><span>TYPE / ACCESS SYSTEM</span><i /></div>
    <svg className={styles.chevrons} viewBox="0 0 132 24" fill="none"><path d="m2 3 9 9-9 9m17-18 9 9-9 9m17-18 9 9-9 9" stroke="currentColor" strokeWidth="3" /><path d="M66 5h64M66 12h46M66 19h56" stroke="currentColor" strokeWidth=".7" /></svg>
    <span className={styles.edgeCode}>Y—XIN / OPEN ARCHIVE</span>
    <span className={styles.bracketTop} /><span className={styles.bracketBottom} />
    <div className={styles.measure}><i /><i /><i /><i /><i /><span>00 / 100</span></div>
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
        <Link href="/" className={styles.back}>HOME</Link>
      </header>
      <div className={styles.canvas}>
        <IndustrialMarks />
        <h1 id="letter-title" className={styles.title} lang="ja"><span className={styles.salutation}>あなた
          <span className={styles.salutationMark} aria-hidden="true">
            <svg className={styles.entranceMark} viewBox="0 0 142 24" fill="none">
              <path d="M1 2h19v5H1zM25 2h21M1 22h14m4 0h4m4 0h10" stroke="currentColor" strokeWidth=".8" />
              <path d="m1 18 8-8h7l-8 8zm21 0 13-13h7L29 18zm25 0L60 5h7L54 18zm25 0L85 5h7L79 18zm25 0 13-13h7l-13 13zm25 0 13-13h7l-13 13z" fill="currentColor" />
            </svg>
          </span>
        </span><span className={styles.addressee}>誰なの</span></h1>
        <div className={styles.whisper} lang="ja"><span>ねえ</span><span>ねえ</span><span>ねえ</span></div>
        <p className={styles.question} lang="ja">教えてよぉ</p>

        <section className={styles.admission} aria-labelledby="login-title" aria-busy={busy}>
          <h2 ref={loginHeading} tabIndex={-1} id="login-title" className={styles.accessibleTitle}>Sign in</h2>
          <div className={styles.tickets}>
            {providers.map((provider, index) => <div key={provider} className={`${styles.ticketWrap} ${index === 0 ? styles.googleWrap : styles.githubWrap}`}>
              <button type="button" disabled={disabled} onClick={() => handleLogin(provider)} aria-label={`Continue with ${provider === 'google' ? 'Google' : 'GitHub'}`} className={`${styles.ticket} ${activeProvider === provider ? styles.departing : ''}`}>
                <span className={styles.ticketBand} aria-hidden="true"><span>Y / XIN</span>{provider === 'google' ? <SiGoogle size={30} /> : <FiGithub size={33} />}<span>ADMIT ONE</span></span>
                <span className={styles.ticketBody}>
                  <span className={styles.ticketTop}><span>YURIA / ACCOUNT ACCESS</span><span>OPEN PASS</span></span>
                  <span className={styles.providerName}>{provider === 'google' ? 'GOOGLE' : 'GITHUB'}<FiPlus size={27} aria-hidden="true" /></span>
                  <span className={styles.ticketDetails}><span><small>ACCESS</small><strong>SIGN IN</strong></span><span><small>SECTION</small><strong>{index === 0 ? 'G—01' : 'H—02'}</strong></span><span><small>ADMISSION</small><strong>ONE / YOU</strong></span></span>
                  <span className={styles.ticketFineprint}>A LITTLE SIGNAL. A LITTLE HELLO.</span>
                </span>
                <span className={styles.stub} aria-hidden="true"><span>ENTRY / {index === 0 ? '001' : '002'}</span><span className={styles.barcode} /><strong>{index === 0 ? '0001—G' : '0002—H'}</strong><span className={styles.stubMark} /></span>
              </button>
            </div>)}
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {busy && <p role="status" className={styles.busy}>CONNECTING TO {activeProvider?.toUpperCase()}…</p>}
          <p className={styles.admissionFoot}>TWO WAYS IN. ONE LITTLE WORLD.<span lang="ja">また、ここで。</span></p>
        </section>
      </div>
      <footer className={styles.footer}><span>YURIA.XIN / PERSONAL SPACE</span><span className={styles.footerQuote} lang="es">está lloviendo en Macondo</span><span>NO SIGNAL IS EVER ORDINARY</span></footer>
    </div>}
  </main>
}
